import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { createElement, act } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import { createServer } from "vite";
import { Window } from "happy-dom";

test("CV upload auto-fills profile fields without submitting; saving preserves hidden background records", async () => {
  const window = new Window({ url: "http://localhost/intake" });
  const previous = new Map();
  for (const [key, value] of Object.entries({
    window, document: window.document, navigator: window.navigator,
    HTMLElement: window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true,
  })) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  }
  const server = await createServer({
    configFile: false, root: fileURLToPath(new URL("..", import.meta.url)), appType: "custom",
    cacheDir: "/tmp/career-reskill-profile-simplification-tests",
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, hmr: false }, esbuild: { jsx: "automatic" },
    resolve: { dedupe: ["react", "react-dom", "@tanstack/react-query"] },
  });
  const { createRoot } = await import("react-dom/client");
  const container = window.document.createElement("div");
  window.document.body.append(container);
  const root = createRoot(container);
  const client = new QueryClient();
  const previousFetch = globalThis.fetch;
  const profileId = "00000000-0000-4000-8000-000000000019";
  const saves = [];
  const requests = [];
  const profile = {
    currentRole: "Student", yearsExperience: 0, industry: "Education",
    skills: ["Python"], interests: ["EdTech", "Custom interest"], weeklyHours: 4,
    profileMode: "detailed",
    professionalBackground: {
      experience: [{ id: "e1", title: "Tutor" }],
      education: [{ id: "ed1", title: "University" }],
      certifications: [{ id: "c1", title: "Teaching certificate" }],
      projects: [{ id: "p1", title: "Learning app" }],
      volunteering: [{ id: "v1", title: "Community tutor" }],
      languages: [{ id: "l1", title: "English", proficiency: "Native" }],
    },
  };
  const before = structuredClone(profile);
  const router = memoryLocation({ path: "/intake", record: true });
  globalThis.fetch = async (url, options) => {
    requests.push({ url, body: JSON.parse(options.body) });
    if (url === "/api/parse-cv") {
      return {
        ok: true,
        json: async () => ({
          displayName: "Amina Example",
          location: "Kuala Lumpur, Malaysia",
          headline: "AI Product Manager with healthcare technology experience",
          targetIndustry: "Healthcare technology",
          currentRole: "AI Product Manager",
          industry: "Healthcare technology",
          yearsOfExperience: 9,
          skills: ["Product analytics", "Stakeholder management", "SQL"],
        }),
      };
    }
    return {
      ok: true,
      json: async () => ({
        profileId, generatedAt: "2026-10-24T00:00:00Z",
        scenarios: Array.from({ length: 3 }, (_, i) => ({
          roleTitle: `Role ${i}`, matchScore: 80, explainableReason: "Uses your skills.",
          skillsGap: ["SQL"], unSdgTag: "SDG 4",
          reskillingPathway: [{ step: "Learn SQL", teachesSkill: "SQL", estimatedHours: 5 }],
        })),
      }),
    };
  };
  try {
    const { IntakePage } = await server.ssrLoadModule("/src/pages/IntakePage.tsx");
    await act(async () => root.render(createElement(QueryClientProvider, { client },
      createElement(Router, { hook: router.hook, searchHook: () => "" },
        createElement(IntakePage, {
          profileId, profile, profileLoading: false, isSaving: false,
          onSave: async (value) => { saves.push(structuredClone(value)); },
        })))));
    const upload = container.querySelector('[data-testid="button-upload-cv"]');
    assert.equal(upload.type, "button");
    const fileInput = container.querySelector('[data-testid="input-cv-file"]');
    assert.equal(fileInput.type, "file");
    assert.equal(fileInput.accept, ".pdf,.docx,.txt");
    await act(async () => upload.click());
    assert.equal(container.querySelector('[data-testid="status-cv-upload"]'), null);
    assert.match(container.querySelector("#cv-upload-help").textContent, /Choose a PDF, DOCX, or TXT file/);
    assert.equal(saves.length, 0);
    assert.equal(requests.length, 0);
    const emptyResumeFile = {
      name: "empty-resume.txt",
      size: 0,
      arrayBuffer: async () => new ArrayBuffer(0),
    };
    Object.defineProperty(fileInput, "files", { configurable: true, value: [emptyResumeFile] });
    await act(async () => {
      fileInput.dispatchEvent(new window.Event("change", { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    assert.match(container.querySelector('[data-testid="status-cv-upload"]').textContent, /Could not read text from this file format/);
    assert.equal(requests.length, 0);

    const resumeText = "A résumé with varied formatting and unstructured professional experience.";
    const resumeFile = {
      name: "haqim-resume.txt",
      size: new TextEncoder().encode(resumeText).length,
      arrayBuffer: async () => new TextEncoder().encode(resumeText).buffer,
    };
    Object.defineProperty(fileInput, "files", { configurable: true, value: [resumeFile] });
    await act(async () => {
      fileInput.dispatchEvent(new window.Event("change", { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    assert.equal(container.querySelector('[data-testid="input-current-role"]').value, "AI Product Manager");
    assert.equal(container.querySelector('[data-testid="input-industry"]').value, "Healthcare technology");
    assert.equal(container.querySelector('[data-testid="text-years-value"]').textContent, "9");
    assert.equal(container.querySelector('[data-testid="input-existing-skills"]').value, "Python, Product analytics, Stakeholder management, SQL");
    assert.equal(container.querySelector('[data-testid="input-display-name"]').value, "Amina Example");
    assert.equal(container.querySelector('[data-testid="input-location"]').value, "Kuala Lumpur, Malaysia");
    assert.equal(container.querySelector('[data-testid="input-headline"]').value, "AI Product Manager with healthcare technology experience");
    assert.equal(container.querySelector('[data-testid="input-target-industry"]').value, "Healthcare technology");
    assert.match(container.querySelector('[data-testid="status-cv-upload"]').textContent, /CV loaded successfully/);
    assert.doesNotMatch(container.querySelector('[data-testid="panel-detailed-profile"]').textContent, /not available yet/);
    assert.equal(saves.length, 0);
    assert.equal(requests.length, 1);
    assert.equal(requests[0].url, "/api/parse-cv");
    assert.deepEqual(requests[0].body, { rawText: resumeText });
    assert.equal(container.querySelectorAll('[data-testid^="button-toggle-profile-"]').length, 4);
    await act(async () => container.querySelector("form").dispatchEvent(
      new window.Event("submit", { bubbles: true, cancelable: true })));
    assert.equal(saves.length, 1);
    assert.equal(requests.length, 2);
    assert.equal(requests[1].url, "/api/generate-pathway");
    assert.deepEqual(saves[0].interests, profile.interests);
    assert.deepEqual(requests[1].body.profile, saves[0]);
    for (const key of Object.keys(profile.professionalBackground)) {
      assert.equal(saves[0].professionalBackground[key][0].title, profile.professionalBackground[key][0].title);
    }
    assert.deepEqual(profile, before);
    assert.equal(router.history.at(-1), "/pathway");
  } finally {
    await act(async () => root.unmount());
    client.clear();
    globalThis.fetch = previousFetch;
    await server.close();
    await window.happyDOM.close();
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
});

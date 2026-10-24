import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { createElement, act } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import { createServer } from "vite";
import { Window } from "happy-dom";
import {
  SECTIONS, entryControlId, issueAttributes, validateEntry, validateEntryIssues,
  validateProfileDraft, validateProfileIssues,
} from "../src/data/professional-profile.ts";

const base = {
  currentRole: "Student", industry: "Education", yearsExperience: 0,
  skills: ["Python"], interests: ["EdTech"], weeklyHours: 4, profileMode: "quick",
  professionalBackground: {},
};

test("error targets use record identity, not titles or filtered positions, without changing messages or drafts", () => {
  const profile = structuredClone(base);
  profile.professionalBackground = {
    about: "a".repeat(5001), linkedinUrl: "not-a-link",
    experience: [
      { id: "blank", title: "" },
      { id: "first", title: "Same title", startDate: "bad" },
      { id: "second/id", title: "Same title", endDate: "bad", skills: ["x".repeat(201)] },
    ],
  };
  const before = structuredClone(profile);
  const issues = validateProfileIssues(profile, profile.skills);
  assert.deepEqual(issues.map((issue) => issue.message), validateProfileDraft(profile, profile.skills));
  assert.deepEqual(profile, before);
  const first = issues.find((issue) => issue.target.entryId === "first");
  const second = issues.find((issue) => issue.target.entryId === "second/id" && issue.message.includes("end date"));
  assert.match(first.message, /Experience #1 \(Same title\)/);
  assert.match(second.message, /Experience #2 \(Same title\)/);
  assert.equal(second.target.controlId, entryControlId("profile", "experience", "second/id", "endDate"));
  assert.notEqual(first.target.controlId, second.target.controlId);
  assert.equal(new Set(issues.map((issue) => issue.id)).size, issues.length);
  assert.deepEqual(validateEntryIssues(SECTIONS[0], before.professionalBackground.experience[1], 0).map((i) => i.message),
    validateEntry(SECTIONS[0], before.professionalBackground.experience[1], 0));
  profile.professionalBackground.experience.splice(0, 2);
  const remaining = validateProfileIssues(profile, profile.skills).find((issue) => issue.message.includes("end date"));
  assert.equal(remaining.target.controlId, second.target.controlId);
  assert.match(remaining.message, /Experience #1/);
  const attrs = issueAttributes(issues, second.target.controlId);
  assert.equal(attrs["aria-invalid"], true);
  assert.ok(attrs["aria-describedby"].includes(second.id));
  assert.deepEqual(issueAttributes([], second.target.controlId), { "aria-invalid": undefined, "aria-describedby": undefined });
});

test("section limits target the section toggle and list, date and URL errors target their own controls", () => {
  const profile = {
    ...base, professionalBackground: {
      projects: Array.from({ length: 31 }, (_, i) => ({
        id: `p${i}`, title: "Repeated", technologies: Array(51).fill("tool"),
        startDate: "2025", endDate: "2024", url: "javascript:bad", secondaryUrl: "bad",
      })),
    },
  };
  const issues = validateProfileIssues(profile, profile.skills);
  assert.equal(issues[0].target.controlId, "profile-projects-head");
  for (const field of ["technologies", "endDate", "url", "secondaryUrl"]) {
    assert.ok(issues.some((issue) => issue.target.controlId === entryControlId("profile", "projects", "p0", field)));
  }
});

test("error links support keyboard activation, expand the correct duplicate record, and retain the shared draft", async () => {
  const window = new Window({ url: "http://localhost/intake" });
  const previous = new Map();
  for (const [key, value] of Object.entries({
    window, document: window.document, navigator: window.navigator,
    HTMLElement: window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true,
  })) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  }
  window.HTMLElement.prototype.scrollIntoView = function () {};
  const { createRoot } = await import("react-dom/client");
  const server = await createServer({
    configFile: false, root: fileURLToPath(new URL("..", import.meta.url)), appType: "custom",
    cacheDir: "/tmp/career-reskill-error-navigation-tests",
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, hmr: false }, esbuild: { jsx: "automatic" },
    resolve: { dedupe: ["react", "react-dom", "@tanstack/react-query"] },
  });
  const client = new QueryClient();
  const container = window.document.createElement("div");
  window.document.body.append(container);
  const root = createRoot(container);
  let saves = 0;
  try {
    const { IntakePage } = await server.ssrLoadModule("/src/pages/IntakePage.tsx");
    const profile = {
      ...base, currentRole: "", professionalBackground: {
        headline: "Unsaved story", about: "a".repeat(5001),
        experience: [
          { id: "blank", title: "" },
          { id: "first", title: "Same title", startDate: "bad-one" },
          { id: "second", title: "Same title", endDate: "bad-two", skills: ["Python", "SQL"] },
        ],
      },
    };
    const before = structuredClone(profile);
    await act(async () => root.render(createElement(QueryClientProvider, { client },
      createElement(Router, { hook: memoryLocation({ path: "/intake" }).hook }, createElement(IntakePage, {
        profileId: "test", profile, profileLoading: false, isSaving: false,
        onSave: async () => { saves += 1; },
      })))));
    const doc = window.document;
    const submit = async () => act(async () => container.querySelector("form").dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true })));
    const click = async (node) => act(async () => node.click());
    const linkTo = (id) => [...container.querySelectorAll(".pi-error-link")].find((link) => link.getAttribute("href") === `#${id}`);
    const keyboardActivate = async (link) => {
      // Native anchors are in the Tab order and retain the browser's Enter activation.
      link.focus();
      assert.equal(doc.activeElement, link);
      assert.equal(link.tabIndex, 0);
      const key = new window.KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true });
      assert.equal(link.dispatchEvent(key), true, "form must not intercept Enter on error links");
      await click(link);
    };
    await submit();
    assert.equal(saves, 0);
    assert.ok(container.querySelector('[data-testid="panel-quick-profile"]'), "submission must not switch modes");
    assert.equal(doc.activeElement, container.querySelector(".pi-error-summary"));
    await keyboardActivate(linkTo("current-role"));
    assert.equal(doc.activeElement.id, "current-role");
    assert.ok(container.querySelector('[data-testid="panel-quick-profile"]'));
    assert.equal(doc.activeElement.getAttribute("aria-invalid"), "true");
    for (const id of doc.activeElement.getAttribute("aria-describedby").split(" ")) assert.ok(doc.getElementById(id));
    await act(async () => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set.call(doc.activeElement, "Student");
      doc.activeElement.dispatchEvent(new window.Event("input", { bubbles: true }));
    });
    assert.equal(linkTo("current-role"), undefined, "correcting a field removes its stale summary link");
    assert.equal(doc.getElementById("current-role").getAttribute("aria-invalid"), null);

    const secondId = entryControlId("profile", "experience", "second", "endDate");
    await keyboardActivate(linkTo(secondId));
    assert.ok(container.querySelector('[data-testid="panel-detailed-profile"]'));
    assert.equal(doc.activeElement.id, secondId);
    assert.equal(doc.activeElement.value, "bad-two");
    assert.equal(doc.getElementById("profile-experience-head").getAttribute("aria-expanded"), "true");
    assert.equal(container.querySelector('[data-testid="button-profile-experience-2-edit"]').getAttribute("aria-expanded"), "true");
    assert.equal(container.querySelector('[data-testid="button-profile-experience-1-edit"]').getAttribute("aria-expanded"), "false");
    assert.match(container.querySelector('[data-testid="button-profile-experience-2-edit"]').getAttribute("aria-label"), /#3: Same title/);
    assert.equal(doc.getElementById("bg-headline").value, "Unsaved story");
    assert.equal(doc.getElementById("existing-skills").value, "Python");
    for (const id of doc.activeElement.getAttribute("aria-describedby").split(" ")) assert.ok(doc.getElementById(id));

    await click(doc.getElementById("profile-experience-head"));
    await keyboardActivate(linkTo(secondId));
    assert.equal(doc.activeElement.id, secondId, "following the same error reopens the section");
    const firstId = entryControlId("profile", "experience", "first", "startDate");
    await keyboardActivate(linkTo(firstId));
    assert.equal(doc.activeElement.id, firstId);
    assert.equal(doc.activeElement.value, "bad-one");

    // Deleting a different row changes display positions, not the surviving target.
    await click(container.querySelector('[data-testid="button-profile-experience-1-remove"]'));
    await click(container.querySelector('[data-testid="button-profile-experience-1-confirm-remove"]'));
    assert.equal(linkTo(firstId), undefined);
    await keyboardActivate(linkTo(secondId));
    assert.equal(doc.activeElement.id, secondId);
    await click(container.querySelector('[data-testid="radio-mode-quick"]'));
    assert.ok(container.querySelector('[data-testid="panel-quick-profile"]'));
    await keyboardActivate(linkTo("bg-about"));
    assert.equal(doc.activeElement.id, "bg-about");
    assert.equal(doc.activeElement.value.length, 5001);
    assert.equal(doc.getElementById("bg-headline").value, "Unsaved story");
    await click(container.querySelector('[data-testid="radio-mode-quick"]'));
    await click(container.querySelector('[data-testid="radio-mode-detailed"]'));
    assert.equal(doc.getElementById("profile-experience-head").getAttribute("aria-expanded"), "false",
      "manual mode changes must not replay an old error focus request");
    assert.deepEqual(profile, before, "navigation never mutates the supplied profile");
    assert.equal(saves, 0, "following links never submits or saves the draft");

    const limitProfile = {
      ...base, professionalBackground: {
        experience: Array.from({ length: 31 }, (_, i) => ({
          id: `limit-${i}`, title: `Role ${i}`, current: i === 0, endDate: i === 0 ? "x".repeat(11) : "",
          ...(i === 0 ? { url: "bad-saved-link" } : {}),
        })),
      },
    };
    await act(async () => root.render(createElement(QueryClientProvider, { client },
      createElement(Router, { hook: memoryLocation({ path: "/intake" }).hook }, createElement(IntakePage, {
        key: "limits", profileId: "limits", profile: limitProfile, profileLoading: false,
        isSaving: false, onSave: async () => { saves += 1; },
      })))));
    await submit();
    await keyboardActivate(linkTo("profile-experience-head"));
    assert.equal(doc.activeElement.id, "profile-experience-head");
    assert.equal(doc.activeElement.getAttribute("aria-expanded"), "true");
    assert.equal(doc.activeElement.getAttribute("aria-invalid"), "true");
    await keyboardActivate(linkTo(entryControlId("profile", "experience", "limit-0", "endDate")));
    assert.equal(doc.activeElement.value, "x".repeat(11), "a length error on an otherwise ignored end date remains fixable");
    assert.equal(container.querySelector('[data-testid="checkbox-profile-experience-0-current"]').checked, true);
    await keyboardActivate(linkTo(entryControlId("profile", "experience", "limit-0", "url")));
    assert.equal(doc.activeElement.value, "bad-saved-link", "supplied fields outside the usual section layout remain editable");
    assert.equal(saves, 0);
  } finally {
    await act(async () => root.unmount());
    client.clear();
    await server.close();
    await window.happyDOM.close();
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
});

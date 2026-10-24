import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createServer } from "vite";
import { Router } from "wouter";
import { validateProfileDraft } from "../src/data/professional-profile.ts";
import { SaveCareerProfileBody } from "../../../lib/api-zod/src/generated/api.ts";

test("profile modes render exclusively with one complete, mode-appropriate form", async () => {
  const server = await createServer({
    configFile: false,
    root: fileURLToPath(new URL("..", import.meta.url)),
    appType: "custom",
    cacheDir: "/tmp/career-reskill-profile-mode-tests",
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, hmr: false },
    esbuild: { jsx: "automatic" },
    resolve: { dedupe: ["react", "react-dom", "@tanstack/react-query"] },
  });
  const client = new QueryClient();
  try {
    const { IntakePage } = await server.ssrLoadModule("/src/pages/IntakePage.tsx");
    const saved = {
      currentRole: "Student", yearsExperience: 0, industry: "Education",
      skills: ["Python", "SQL"], interests: ["EdTech", "Data & analytics"], weeklyHours: 7,
      professionalBackground: {
        headline: "Draft headline",
        education: [{ id: "education", title: "Test University" }],
        projects: [{ id: "project", title: "Existing project", technologies: ["SQL"] }],
      },
    };
    const render = (profile, isSaving = false) => renderToStaticMarkup(
      createElement(QueryClientProvider, { client }, createElement(Router, { ssrPath: "/intake" }, createElement(IntakePage, {
        profileId: "00000000-0000-4000-8000-000000000018",
        profile, profileLoading: false, onSave: async () => {}, isSaving,
      }))),
    );
    const quick = render({ ...saved, profileMode: "quick" });
    const detailed = render({ ...saved, profileMode: "detailed" });
    assert.match(quick, /data-testid="panel-quick-profile"/);
    assert.doesNotMatch(quick, /data-testid="panel-detailed-profile"|data-testid="button-open-import"|Professional identity/);
    assert.match(detailed, /data-testid="panel-detailed-profile"/);
    assert.doesNotMatch(detailed, /data-testid="panel-quick-profile"|>Your experience<\/h2>|What draws your attention/);
    assert.doesNotMatch(detailed, /data-testid="button-open-import"|Import from text|Read text/);
    assert.match(detailed, /Professional identity/);
    assert.match(detailed, /data-testid="button-upload-cv"/);
    assert.doesNotMatch(quick, /data-testid="button-upload-cv"/);
    assert.ok(detailed.indexOf('data-testid="button-upload-cv"') < detailed.indexOf("Professional identity"));
    for (const key of ["experience", "education", "certifications", "projects"]) {
      assert.match(detailed, new RegExp(`data-testid="button-toggle-profile-${key}"`));
    }
    for (const key of ["volunteering", "organizations", "courses", "awards", "publications", "languages", "testScores"]) {
      assert.doesNotMatch(detailed, new RegExp(`data-testid="button-toggle-profile-${key}"`));
    }
    assert.match(detailed, /Learning preferences/);
    for (const html of [quick, detailed]) {
      assert.doesNotMatch(html, /select-global-language|select-profile-language/);
      assert.equal((html.match(/<form\b/g) ?? []).length, 1);
      assert.equal((html.match(/type="submit"/g) ?? []).length, 1);
      for (const id of ["current-role", "industry", "years-experience", "existing-skills", "interest-search", "weekly-hours", "industry-options"]) {
        assert.equal((html.match(new RegExp(`\\bid="${id}"`, "g")) ?? []).length, 1, `${id} must appear once`);
      }
      assert.match(html, /value="Student"/);
      assert.match(html, /Python, SQL/);
      assert.match(html, /Remove EdTech/);
      assert.match(html, /Remove Data &amp; analytics/);
      assert.match(html, /id="weekly-hours"[^>]*value="7"/);
    }
    const identity = detailed.indexOf("Professional identity");
    const background = detailed.indexOf(">Background ");
    const preferences = detailed.indexOf("Learning preferences");
    assert.ok(detailed.indexOf('id="current-role"') > identity && detailed.indexOf('id="current-role"') < background);
    assert.ok(detailed.indexOf('id="existing-skills"') > background && detailed.indexOf('id="existing-skills"') < preferences);
    assert.ok(detailed.indexOf('id="interest-search"') > preferences);
    assert.match(detailed, /value="Draft headline"/);
    assert.match(render({ ...saved, profileMode: "detailed" }, true), /<fieldset[^>]*disabled=""/);

    // A new detailed learner has every required control in this view; filling
    // those fields satisfies the unchanged save contract without switching modes.
    const fresh = { currentRole: "", yearsExperience: 0, industry: "", skills: [], interests: [], weeklyHours: 4, profileMode: "detailed" };
    const freshHtml = render(fresh);
    assert.doesNotMatch(freshHtml, /panel-quick-profile/);
    for (const id of ["current-role", "industry", "existing-skills", "interest-search"]) {
      assert.ok(freshHtml.includes(`id="${id}"`));
    }
    const completed = { ...fresh, ...saved, professionalBackground: {}, profileMode: "detailed" };
    assert.deepEqual(validateProfileDraft(completed, completed.skills), []);
    assert.equal(SaveCareerProfileBody.parse(completed).profileMode, "detailed");
    // Changing the persisted mode neither mutates nor drops the background.
    assert.deepEqual(SaveCareerProfileBody.parse({ ...saved, profileMode: "quick" }).professionalBackground, saved.professionalBackground);
    assert.deepEqual(SaveCareerProfileBody.parse({ ...saved, profileMode: "detailed" }).professionalBackground, saved.professionalBackground);
  } finally {
    client.clear();
    await server.close();
  }
});

import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { createElement, act } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createServer } from "vite";
import { Window } from "happy-dom";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";

test("the app stays English-only and clears a previously saved language choice", async () => {
  const window = new Window({ url: "http://localhost/intake" });
  const previous = new Map();
  for (const [key, value] of Object.entries({
    window, document: window.document, navigator: window.navigator,
    HTMLElement: window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true,
    requestAnimationFrame: () => 1, cancelAnimationFrame: () => {},
  })) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  }
  const server = await createServer({
    configFile: false, root: fileURLToPath(new URL("..", import.meta.url)), appType: "custom",
    cacheDir: "/tmp/career-reskill-global-language-tests",
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, hmr: false }, esbuild: { jsx: "automatic" },
    resolve: { dedupe: ["react", "react-dom", "wouter"] },
  });
  const { createRoot } = await import("react-dom/client");
  const container = window.document.createElement("div");
  window.document.body.append(container);
  const root = createRoot(container);
  window.localStorage.setItem("northstar-career-language", "zh");
  const location = memoryLocation({ path: "/intake" });

  const client = new QueryClient({ defaultOptions: { queries: { enabled: false, retry: false } } });
  const previousFetch = globalThis.fetch;
  const fetchCalls = [];
  globalThis.fetch = async (...args) => { fetchCalls.push(args); throw new Error("Network is disabled in this UI test"); };
  const profile = {
    currentRole: "Student", yearsExperience: 0, industry: "Education",
    skills: ["Python"], interests: ["Education"], weeklyHours: 4,
    profileMode: "detailed", professionalBackground: {},
  };

  try {
    const languageModule = await server.ssrLoadModule("/src/i18n/LanguageContext.tsx");
    const { LanguageProvider } = languageModule;
    const { Shell } = await server.ssrLoadModule("/src/components/Shell.tsx");
    const { IntakePage } = await server.ssrLoadModule("/src/pages/IntakePage.tsx");
    const { RadarPage } = await server.ssrLoadModule("/src/pages/RadarPage.tsx");
    const { PathwayPage } = await server.ssrLoadModule("/src/pages/PathwayPage.tsx");
    const pages = createElement("div", null,
      createElement(IntakePage, { profileId: "00000000-0000-4000-8000-000000000020", profile, profileLoading: false, onSave: async () => {}, isSaving: false }),
      createElement(RadarPage, { profile: null }),
      createElement(PathwayPage, { profileId: "00000000-0000-4000-8000-000000000020", profile: null, profileLoading: false }),
    );
    await act(async () => root.render(createElement(Router, { hook: location.hook, searchHook: location.searchHook },
      createElement(QueryClientProvider, { client },
        createElement(LanguageProvider, null, createElement(Shell, { profile: null }, pages))))));

    assert.equal(container.querySelector('[data-testid="link-nav-profile"]').textContent.trim(), "Your profile");
    assert.equal(container.querySelector('[data-testid="select-global-language"]'), null);
    assert.equal(container.querySelector('[data-testid="heading-profile-title"]').textContent, "Your experience is a strong starting point.");
    assert.equal(container.querySelector('[data-testid="heading-radar-title"]').textContent, "A clearer view of what’s changing.");
    assert.equal(container.querySelector('[data-testid="heading-pathway-title"]').textContent, "A route that starts where you are.");
    assert.equal(container.querySelector('[data-testid="button-upload-cv"]').textContent.trim(), "Upload CV / Resume to Auto-Fill");
    assert.match(container.querySelector('label[for="current-role"]').textContent, /Current role or status/);
    assert.match(container.querySelector('label[for="interest-search"]').textContent, /Areas you’re curious about/);
    assert.deepEqual(fetchCalls, [], "Switching language must not trigger network requests");
    assert.equal(window.localStorage.getItem("northstar-career-language"), null);
    assert.equal(window.document.documentElement.lang, "en");
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

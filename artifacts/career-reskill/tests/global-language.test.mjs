import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { createElement, act } from "react";
import { createServer } from "vite";
import { Window } from "happy-dom";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";

test("global language selection translates navigation and page headings immediately and persists", async () => {
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
  const location = memoryLocation({ path: "/intake" });

  let useLanguage;
  function PageHeadings() {
    const { t } = useLanguage();
    return createElement("div", null,
      createElement("h1", { "data-testid": "heading-profile-title" }, t("profile.title")),
      createElement("h2", { "data-testid": "heading-radar-title" }, t("radar.title")),
      createElement("h2", { "data-testid": "heading-pathway-title" }, t("pathway.title")),
    );
  }

  try {
    const languageModule = await server.ssrLoadModule("/src/i18n/LanguageContext.tsx");
    useLanguage = languageModule.useLanguage;
    const { LanguageProvider } = languageModule;
    const { Shell } = await server.ssrLoadModule("/src/components/Shell.tsx");
    await act(async () => root.render(createElement(Router, { hook: location.hook, searchHook: location.searchHook },
      createElement(LanguageProvider, null, createElement(Shell, { profile: null }, createElement(PageHeadings))))));

    assert.equal(container.querySelector('[data-testid="link-nav-profile"]').textContent.trim(), "Your profile");
    assert.equal(container.querySelector('[data-testid="heading-profile-title"]').textContent, "Your experience is a strong starting point.");
    const select = container.querySelector('[data-testid="select-global-language"]');
    assert.ok(select);

    await act(async () => {
      select.value = "ms";
      select.dispatchEvent(new window.Event("change", { bubbles: true }));
    });
    assert.equal(container.querySelector('[data-testid="link-nav-profile"]').textContent.trim(), "Profil anda");
    assert.equal(container.querySelector('[data-testid="link-nav-radar"]').textContent.trim(), "Radar kemahiran");
    assert.equal(container.querySelector('[data-testid="link-nav-pathways"]').textContent.trim(), "Laluan kerjaya");
    assert.equal(container.querySelector('[data-testid="heading-profile-title"]').textContent, "Pengalaman anda ialah asas yang kukuh.");
    assert.equal(container.querySelector('[data-testid="heading-radar-title"]').textContent, "Lihat dengan lebih jelas perubahan yang berlaku.");
    assert.equal(container.querySelector('[data-testid="heading-pathway-title"]').textContent, "Pilihan yang baik. Langkah seterusnya yang jelas.");
    assert.equal(window.localStorage.getItem("northstar-career-language"), "ms");

    await act(async () => {
      select.value = "zh";
      select.dispatchEvent(new window.Event("change", { bubbles: true }));
    });
    assert.equal(container.querySelector('[data-testid="link-nav-profile"]').textContent.trim(), "个人资料");
    assert.equal(container.querySelector('[data-testid="link-nav-radar"]').textContent.trim(), "技能趋势");
    assert.equal(container.querySelector('[data-testid="link-nav-pathways"]').textContent.trim(), "职业路径");
    assert.equal(container.querySelector('[data-testid="heading-profile-title"]').textContent, "你的经验是坚实的起点。");
    assert.equal(container.querySelector('[data-testid="heading-radar-title"]').textContent, "更清晰地了解正在发生的变化。");
    assert.equal(container.querySelector('[data-testid="heading-pathway-title"]').textContent, "更多选择，清晰的下一步。");
    assert.equal(window.localStorage.getItem("northstar-career-language"), "zh");
  } finally {
    await act(async () => root.unmount());
    await server.close();
    await window.happyDOM.close();
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
});

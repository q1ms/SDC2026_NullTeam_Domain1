import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { createElement as h, act } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Link, Route, Router, Switch } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import { createServer } from "vite";
import { Window } from "happy-dom";

test("unsaved profile guards retain cancelled drafts, compare reversions, and clear only on successful save", async () => {
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
  const previousFetch = globalThis.fetch;
  const { createRoot } = await import("react-dom/client");
  const server = await createServer({
    configFile: false, root: fileURLToPath(new URL("..", import.meta.url)), appType: "custom",
    cacheDir: "/tmp/career-reskill-unsaved-tests",
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, hmr: false }, esbuild: { jsx: "automatic" },
    resolve: { dedupe: ["react", "react-dom", "@tanstack/react-query"] },
  });
  const client = new QueryClient();
  const container = window.document.createElement("div");
  window.document.body.append(container);
  const root = createRoot(container);
  let confirmations = 0;
  let acceptLeave = false;
  window.confirm = () => { confirmations += 1; return acceptLeave; };
  const profile = {
    currentRole: "Student", industry: "Education", yearsExperience: 0,
    skills: ["Python"], interests: ["EdTech"], weeklyHours: 4, profileMode: "quick",
    professionalBackground: { headline: "Keep my detailed background" },
  };
  let saves = 0;
  let saveAction = async () => { throw new Error("Save failed"); };
  let generationAction = async () => ({ ok: false, status: 503, json: async () => ({ error: "Generation unavailable" }) });
  let generations = 0;
  globalThis.fetch = async () => { generations += 1; return generationAction(); };
  const location = memoryLocation({ path: "/intake" });
  const unloadWarns = () => {
    const event = new window.Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    return event.defaultPrevented;
  };
  const click = async (selector) => act(async () => container.querySelector(selector).click());
  const edit = async (id, value) => act(async () => {
    const input = window.document.getElementById(id);
    const prototype = input instanceof window.HTMLTextAreaElement
      ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, "value").set.call(input, value);
    input.dispatchEvent(new window.Event("input", { bubbles: true }));
  });
  const submit = () => container.querySelector("form").dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
  try {
    const { IntakePage } = await server.ssrLoadModule("/src/pages/IntakePage.tsx");
    const render = async (loadedProfile = profile, loading = false) => act(async () => root.render(
      h(QueryClientProvider, { client }, h(Router, { hook: location.hook },
        h("nav", {}, h(Link, { href: "/radar", id: "leave" }, "Skills radar"),
          h(Link, { href: "/intake", id: "same" }, "Your profile")),
        h(Switch, {},
          h(Route, { path: "/intake" }, h(IntakePage, {
            profileId: "test", profile: loadedProfile, profileLoading: loading, isSaving: false,
            onSave: async () => { saves += 1; await saveAction(); },
          })),
          h(Route, { path: "/radar" }, h("div", { id: "radar" }, "Radar")),
          h(Route, { path: "/pathway" }, h("div", { id: "pathway" }, "Pathway")),
        )),
      ),
    ));
    await render(null, true);
    assert.equal(unloadWarns(), false);
    await render();
    assert.equal(unloadWarns(), false, "loading a saved profile is clean");
    await edit("current-role", "Designer");
    assert.equal(unloadWarns(), true);
    await click("#leave");
    assert.equal(confirmations, 1);
    assert.equal(window.document.getElementById("current-role").value, "Designer");
    assert.equal(container.querySelector("#radar"), null);
    await click("#same");
    assert.equal(confirmations, 1, "same editor link is safe");
    await edit("current-role", "Student");
    assert.equal(unloadWarns(), false, "reverting the value is clean");
    await edit("existing-skills", "Python, unfinished");
    assert.equal(unloadWarns(), true, "raw skills input is guarded");
    await edit("existing-skills", "Python");
    assert.equal(unloadWarns(), false);

    await click('[data-testid="radio-mode-detailed"]');
    assert.equal(confirmations, 1, "mode switches do not prompt");
    await edit("bg-headline", "Edited detailed background");
    await click('[data-testid="radio-mode-quick"]');
    await click('[data-testid="radio-mode-detailed"]');
    assert.equal(window.document.getElementById("bg-headline").value, "Edited detailed background");
    assert.equal(confirmations, 1);
    await click('[data-testid="radio-mode-quick"]');
    await act(async () => submit());
    assert.equal(saves, 1);
    assert.equal(generations, 0);
    assert.equal(unloadWarns(), true, "save failure keeps changes unsaved");
    await click("#leave");
    assert.equal(confirmations, 2);
    assert.equal(window.document.getElementById("current-role").value, "Student");

    let resolveSave;
    saveAction = () => new Promise((resolve) => { resolveSave = resolve; });
    await act(async () => { submit(); submit(); });
    assert.equal(saves, 2, "synchronous lock prevents duplicate saves");
    assert.equal(unloadWarns(), true, "pending save is still unsaved");
    await act(async () => resolveSave());
    assert.equal(unloadWarns(), false, "successful save clears warning even if generation fails");
    assert.equal(generations, 1);
    await edit("current-role", "Designer");
    assert.equal(unloadWarns(), true, "new edits after save are dirty again");
    saveAction = async () => {};
    generationAction = async () => ({
      ok: true,
      json: async () => ({
        profileId: "test", generatedAt: "2026-10-24T00:00:00Z",
        scenarios: Array.from({ length: 3 }, () => ({
          roleTitle: "Designer", matchScore: 80, explainableReason: "Test", skillsGap: [],
          reskillingPathway: Array.from({ length: 3 }, () => ({ step: "Learn", estimatedHours: 2 })),
          unSdgTag: "SDG 4",
        })),
      }),
    });
    await act(async () => submit());
    assert.ok(container.querySelector("#pathway"), "intentional redirect is not blocked");
    assert.equal(confirmations, 2);
    assert.equal(unloadWarns(), false, "unmount removes unload guard");

    await act(async () => location.navigate("/intake"));
    await edit("current-role", "Another draft");
    acceptLeave = true;
    await click("#leave");
    assert.ok(container.querySelector("#radar"), "accepting confirmation allows navigation");
    assert.equal(confirmations, 3);
    assert.equal(unloadWarns(), false);
  } finally {
    await act(async () => root.unmount());
    client.clear();
    await server.close();
    await window.happyDOM.close();
    globalThis.fetch = previousFetch;
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
});

import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { createElement as h, act } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Router as WouterRouter } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import { createServer } from "vite";
import { Window } from "happy-dom";
import { isProfileNotFoundError } from "../src/data/profile.ts";

test("only profile 404 errors trigger recovery", () => {
  assert.equal(isProfileNotFoundError({ status: 404 }), true);
  assert.equal(isProfileNotFoundError({ response: { status: 404 } }), true);
  assert.equal(isProfileNotFoundError({ status: 503 }), false);
  assert.equal(isProfileNotFoundError(new Error("network unavailable")), false);
});

test("a missing saved profile gets a fresh ID and redirects to the intake form", async () => {
  const window = new Window({ url: "http://localhost/radar" });
  const previousGlobals = new Map();
  for (const [key, value] of Object.entries({
    window,
    document: window.document,
    navigator: window.navigator,
    HTMLElement: window.HTMLElement,
    localStorage: window.localStorage,
    requestAnimationFrame: (callback) => window.setTimeout(() => callback(Date.now()), 16),
    cancelAnimationFrame: (handle) => window.clearTimeout(handle),
    IS_REACT_ACT_ENVIRONMENT: true,
  })) {
    previousGlobals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  }
  const previousFetch = globalThis.fetch;
  const server = await createServer({
    configFile: false,
    root: fileURLToPath(new URL("..", import.meta.url)),
    appType: "custom",
    cacheDir: "/tmp/career-reskill-profile-recovery-tests",
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, hmr: false },
    esbuild: { jsx: "automatic" },
    resolve: {
      alias: { "@": fileURLToPath(new URL("../src", import.meta.url)) },
      dedupe: ["react", "react-dom", "@tanstack/react-query"],
    },
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const container = window.document.createElement("div");
  window.document.body.append(container);
  const root = (await import("react-dom/client")).createRoot(container);
  const requestedProfileIds = [];
  window.localStorage.setItem("career-reskill-profile-id-v1", "profile-deleted-with-database");
  globalThis.fetch = async (input) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const match = url.match(/\/api\/profiles\/([^/?]+)/);
    if (!match) throw new Error(`Unexpected request during profile recovery: ${url}`);
    requestedProfileIds.push(decodeURIComponent(match[1]));
    return new Response(JSON.stringify({ error: "Profile not found" }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  };

  const location = memoryLocation({ path: "/no-match" });
  try {
    const [{ CareerReskillRouter }, { LanguageProvider }] = await Promise.all([
      server.ssrLoadModule("/src/App.tsx"),
      server.ssrLoadModule("/src/i18n/LanguageContext.tsx"),
    ]);
    await act(async () => root.render(
        h(QueryClientProvider, { client },
          h(WouterRouter, { hook: location.hook },
            h(LanguageProvider, null, h(CareerReskillRouter)))),
      ));
    for (let attempt = 0; attempt < 80 && !container.querySelector('[data-testid="panel-quick-profile"]'); attempt += 1) {
      await act(async () => new Promise((resolve) => setTimeout(resolve, 15)));
    }

    const freshId = window.localStorage.getItem("career-reskill-profile-id-v1");
    assert.ok(
      requestedProfileIds.includes("profile-deleted-with-database"),
      `the saved profile ID should be requested; received ${JSON.stringify(requestedProfileIds)}`,
    );
    assert.ok(freshId);
    assert.notEqual(
      freshId,
      "profile-deleted-with-database",
      JSON.stringify({
        requestIds: requestedProfileIds,
        queries: client.getQueryCache().getAll().map((query) => ({
          key: query.queryKey,
          error: query.state.error && {
            name: query.state.error.name,
            status: query.state.error.status,
            responseStatus: query.state.error.response?.status,
            message: query.state.error.message,
          },
        })),
        profileError: container.querySelector('[data-testid="status-profile-load-error"]')?.textContent,
      }),
    );
    assert.ok(requestedProfileIds.includes(freshId), "the fresh profile ID is used for the empty profile check");
    assert.ok(container.querySelector('[data-testid="panel-quick-profile"]'), "the user lands on the intake form");
    assert.equal(container.querySelector('[data-testid="status-profile-load-error"]'), null);
  } finally {
    await act(async () => root.unmount());
    client.clear();
    await server.close();
    await window.happyDOM.close();
    globalThis.fetch = previousFetch;
    for (const [key, descriptor] of previousGlobals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
});

import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { createElement, act } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import { createServer } from "vite";
import { Window } from "happy-dom";

const scenario = (roleTitle, matchScore) => ({
  roleTitle, matchScore, explainableReason: "Fixture skills match.",
  skillsGap: ["SQL"], matchedSkills: ["Communication"],
  unSdgTag: "SDG 8: Decent Work and Economic Growth", evidenceIds: [],
  reskillingPathway: [],
});
const analysis = {
  model: "Fixture model, not a forecast",
  limitations: "Check local requirements. No hiring guarantees.",
  profileSummary: "Sample learner",
  evidence: { fetchedAt: "2026-10-24", newsStatus: "Fixture", signals: [] },
  comparisons: [
    { id: "moderate", name: "Moderate adoption", assumptions: "Gradual automation assumption.",
      scenarios: [scenario("Alpha", 60), scenario("Beta", 50), scenario("Gradual only", 40)] },
    { id: "fast", name: "Fast adoption", assumptions: "Faster automation assumption.",
      scenarios: [scenario("Beta", 63), scenario("Alpha", 50), scenario("Faster only", 41)] },
  ],
};

test("comparison explains scores and missing roles, and scenario selection updates the actual recommendations", async () => {
  const server = await createServer({
    configFile: false, root: fileURLToPath(new URL("..", import.meta.url)), appType: "custom",
    cacheDir: "/tmp/career-adoption-comparison-tests",
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, hmr: false }, esbuild: { jsx: "automatic" },
    resolve: { dedupe: ["react", "react-dom", "@tanstack/react-query", "wouter"] },
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  let root;
  let window;
  const previous = new Map();
  const originalFetch = globalThis.fetch;
  try {
    const { AdoptionComparisonPanel } = await server.ssrLoadModule("/src/components/AdoptionComparisonPanel.tsx");
    const before = JSON.stringify(analysis);
    const renderPanel = (value = analysis, selectedId = "moderate") =>
      renderToStaticMarkup(createElement(AdoptionComparisonPanel, {
        analysis: value, selectedId, onSelect: () => {},
      }));
    const parse = (html) => {
      const document = new Window().document;
      document.body.innerHTML = html;
      return document;
    };
    const document = parse(renderPanel());
    const text = document.body.textContent.replace(/\s+/g, " ");
    for (const content of ["Gradual AI adoption", "Faster AI adoption", "1st choice",
      "Fit score", "60", "Outside top 3", "-13 pts", "+10 pts", "Not in Gradual", "Gradual Only",
      "Change vs Faster AI",
      "Gradual: Traditional skills remain strong.", "Faster: AI oversight roles take priority.",
      "How this works",
      "How We Score (1-100)", "current skills and interests align",
      "not a probability of getting a job offer", "The Two AI Futures",
      "Gradual AI:", "Faster AI:", "Things to Keep in Mind (Limitations)",
      "Exact matches only:", "Unverified data:", "Local context matters:"]) {
      assert.ok(text.includes(content), `Missing explanation: ${content}`);
    }
    assert.doesNotMatch(text, /Gradual automation assumption|Faster automation assumption|No hiring guarantees/);
    assert.doesNotMatch(text, /fit-score points (?:lower|higher) with faster adoption/);
    assert.doesNotMatch(text, /#1 ·|Not ranked|n\/a/);
    assert.equal(document.querySelector("table"), null);
    for (const role of ["gradual-only", "faster-only"]) {
      const row = document.querySelector(`[data-testid="row-comparison-${role}"]`);
      assert.equal(row.querySelectorAll(".cmp-score").length, 1, "An absent role must not get an invented score");
    }
    assert.ok(document.querySelector('[data-testid="badge-change-faster-only"]').textContent.includes("Not in Gradual"));
    assert.ok(document.querySelector('[data-testid="badge-change-gradual-only"]').textContent.includes("Gradual Only"));
    assert.equal(document.querySelector("details").hasAttribute("open"), false);
    assert.match(text, /not.*probabilit/i);
    assert.match(text, /not.*forecast/i);
    assert.equal(document.querySelector('[data-testid="button-comparison-moderate"]').getAttribute("aria-pressed"), "true");
    // The Change column follows the selected scenario, so its direction and baseline reverse.
    const fastDocument = parse(renderPanel(analysis, "fast"));
    const fastText = fastDocument.body.textContent.replace(/\s+/g, " ");
    assert.ok(fastText.includes("Score down by 10 points for Faster AI adoption compared with Gradual AI adoption."));
    assert.ok(fastText.includes("Score up by 13 points for Faster AI adoption compared with Gradual AI adoption."));
    assert.ok(fastText.includes("Change vs Gradual AI"));
    assert.ok(fastDocument.querySelector('[data-testid="badge-change-faster-only"]').textContent.includes("New Top Option"));
    assert.ok(fastDocument.querySelector('[data-testid="badge-change-gradual-only"]').textContent.includes("Not in Faster"));
    // Scenario IDs determine the comparison baseline, not the order in the payload.
    const reversed = structuredClone(analysis);
    reversed.comparisons.reverse();
    assert.ok(parse(renderPanel(reversed)).body.textContent.includes("Score up by 10 points for Gradual AI adoption compared with Faster AI adoption."));
    const ties = structuredClone(analysis);
    ties.comparisons[1].scenarios[1].matchScore = 60;
    ties.comparisons[0].scenarios[1].matchScore = 60;
    const tiedText = parse(renderPanel(ties)).body.textContent;
    assert.ok(tiedText.includes("Same fit score in both adoption scenarios."));
    assert.ok(tiedText.includes("2nd choice"));
    const empty = structuredClone(analysis);
    empty.comparisons.forEach((comparison) => { comparison.scenarios = []; });
    assert.doesNotThrow(() => renderPanel(empty));
    assert.equal(JSON.stringify(analysis), before, "Rendering must not mutate saved data");

    // Exercise the real controlled parent flow, without a browser service or any network.
    window = new Window({ url: "http://localhost/pathway?demo=1" });
    for (const [key, value] of Object.entries({
      window, document: window.document, navigator: window.navigator,
      HTMLElement: window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true,
    })) {
      previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
      Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
    }
    const networkCalls = [];
    globalThis.fetch = async (...args) => { networkCalls.push(args); throw new Error("Unexpected network request"); };
    const { createRoot } = await import("react-dom/client");
    const { PathwayPage } = await server.ssrLoadModule("/src/pages/PathwayPage.tsx");
    const pathway = { profileId: "00000000-0000-4000-8000-000000000025",
      generatedAt: "2026-10-24T00:00:00Z", scenarios: analysis.comparisons[0].scenarios, analysis };
    client.setQueryData(["/api/pathway-demo"], pathway);
    client.setQueryData(["/api/sdgs/skills"], []);
    const container = window.document.createElement("div");
    window.document.body.append(container);
    root = createRoot(container);
    const location = memoryLocation({ path: "/pathway" });
    const renderPage = () => root.render(createElement(QueryClientProvider, { client },
      createElement(Router, { hook: location.hook, searchHook: () => "?demo=1" }, createElement(PathwayPage, {
        profileId: pathway.profileId, profile: null, profileLoading: false,
      }))));
    await act(async () => { renderPage(); });
    const top = () => container.querySelector('[data-testid="card-top-recommendation"]');
    assert.ok(top().textContent.includes("Alpha"));
    assert.equal(container.querySelectorAll('[data-testid^="card-scenario-"]').length, 3);
    const fastButton = container.querySelector('[data-testid="button-comparison-fast"]');
    fastButton.focus();
    assert.equal(window.document.activeElement, fastButton);
    await act(async () => { fastButton.click(); });
    assert.equal(fastButton.getAttribute("aria-pressed"), "true");
    assert.ok(top().textContent.includes("Beta"));
    assert.ok(top().textContent.includes("Faster AI adoption"));
    assert.ok(container.textContent.includes("Faster only"));
    assert.ok(container.querySelector('[data-testid="badge-change-alpha"]').textContent.includes("-10 pts"));
    assert.ok(container.querySelector('[data-testid="label-comparison-direction"]')?.textContent.includes("Change vs Gradual AI"));
    await act(async () => { container.querySelector('[data-testid="button-comparison-moderate"]').click(); });
    assert.ok(top().textContent.includes("Alpha"));
    assert.ok(container.querySelector('[data-testid="badge-change-alpha"]').textContent.includes("+10 pts"));
    // A saved legacy pathway still renders its roles without an analysis section.
    await act(async () => {
      client.setQueryData(["/api/pathway-demo"], { ...pathway, analysis: undefined });
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
    assert.ok(container.querySelector('[data-testid="status-legacy-pathway"]'));
    assert.equal(container.querySelector('[data-testid="card-adoption-comparison"]'), null);
    assert.ok(top().textContent.includes("Alpha"));
    assert.deepEqual(networkCalls, [], "Scenario changes and demo must not fetch or save");
  } finally {
    if (root) await act(async () => { root.unmount(); });
    globalThis.fetch = originalFetch;
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
    await window?.happyDOM.close();
    client.clear();
    await server.close();
  }
});

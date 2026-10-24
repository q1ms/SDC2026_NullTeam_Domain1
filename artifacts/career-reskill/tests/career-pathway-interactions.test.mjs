import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { act, createElement } from "react";
import { createServer } from "vite";
import { Window } from "happy-dom";

test("pathway cards expose collapsed evidence and steps, interactive skill checks, score tooltip, and profile context dialog", async () => {
  const window = new Window({ url: "http://localhost/pathway" });
  const previous = new Map();
  const globals = {
    window,
    document: window.document,
    navigator: window.navigator,
    HTMLElement: window.HTMLElement,
    HTMLInputElement: window.HTMLInputElement,
    HTMLTextAreaElement: window.HTMLTextAreaElement,
    HTMLSelectElement: window.HTMLSelectElement,
    Element: window.Element,
    Node: window.Node,
    NodeFilter: window.NodeFilter,
    Event: window.Event,
    CustomEvent: window.CustomEvent,
    MouseEvent: window.MouseEvent,
    FocusEvent: window.FocusEvent,
    PointerEvent: window.PointerEvent,
    MutationObserver: window.MutationObserver,
    getComputedStyle: window.getComputedStyle.bind(window),
    requestAnimationFrame: window.requestAnimationFrame.bind(window),
    cancelAnimationFrame: window.cancelAnimationFrame.bind(window),
    IS_REACT_ACT_ENVIRONMENT: true,
  };
  for (const [key, value] of Object.entries(globals)) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  }

  const server = await createServer({
    configFile: false,
    root: fileURLToPath(new URL("..", import.meta.url)),
    appType: "custom",
    cacheDir: "/tmp/career-pathway-interactions-vite",
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, hmr: false },
    esbuild: { jsx: "automatic" },
    resolve: { dedupe: ["react", "react-dom"] },
  });
  const { createRoot } = await import("react-dom/client");
  const container = window.document.createElement("div");
  window.document.body.append(container);
  const root = createRoot(container);
  const scoreBasis = "30 starting points + 4 skill matches; relative estimate, not a probability.";
  const scenario = {
    roleTitle: "Business Intelligence Analyst",
    matchScore: 78,
    explainableReason: "Your operations experience informs this option.",
    scoreBasis,
    skillsGap: ["SQL", "Data visualization"],
    matchedSkills: ["Process mapping"],
    unSdgTag: "SDG 8",
    evidenceIds: ["report-1"],
    paceEstimate: "80–100 hours over 17–25 weeks at 4 h/week.",
    reskillingPathway: [
      { step: "Learn SQL", estimatedHours: 20, resourceLink: "https://example.test/sql" },
      { step: "Build a dashboard", estimatedHours: 16, resourceLink: "https://example.test/dashboard" },
    ],
  };
  const evidence = new Map([["report-1", {
    id: "report-1", source: "Employer survey", title: "Skills outlook", url: "https://example.test/report",
  }]]);

  try {
    const { ScenarioCard } = await server.ssrLoadModule("/src/components/ScenarioCard.tsx");
    const { ProfileContextDialog } = await server.ssrLoadModule("/src/components/ProfileContextDialog.tsx");
    await act(async () => root.render(createElement("div", null,
      createElement(ProfileContextDialog, { profileSummary: "Operations Coordinator · 4 learning hours per week" }),
      createElement(ScenarioCard, { scenario, index: 0, evidence }))));

    const evidenceAccordion = container.querySelector('[data-testid="details-scenario-evidence-0"]');
    const stepsAccordion = container.querySelector('[data-testid="details-scenario-steps-0"]');
    assert.ok(evidenceAccordion && stepsAccordion);
    assert.equal(evidenceAccordion.open, false);
    assert.equal(stepsAccordion.open, false);
    assert.equal(container.querySelector('[data-testid="link-scenario-evidence-0-report-1"]').textContent, "Employer survey: Skills outlook");
    assert.equal(container.querySelectorAll('[data-testid^="text-scenario-step-0-"]').length, 2);

    const checkbox = container.querySelector('[data-testid="checkbox-scenario-skill-0-0"]');
    const checkboxLabel = container.querySelector('[data-testid="label-scenario-skill-0-0"]');
    assert.equal(checkbox.checked, false);
    await act(async () => checkbox.click());
    assert.equal(checkbox.checked, true);
    assert.ok(checkboxLabel.classList.contains("is-checked"));
    await act(async () => checkbox.click());
    assert.equal(checkbox.checked, false);
    assert.ok(!checkboxLabel.classList.contains("is-checked"));

    assert.ok(!container.textContent.includes(scoreBasis), "The score math should not be visible until the tooltip opens");
    const scoreTrigger = container.querySelector('[data-testid="status-scenario-match-0"]');
    await act(async () => {
      scoreTrigger.focus();
      await new Promise((resolve) => setTimeout(resolve, 30));
    });
    assert.ok(window.document.querySelector('[data-testid="tooltip-scenario-basis-0"]')?.textContent.includes(scoreBasis));

    const contextTrigger = container.querySelector('[data-testid="button-view-profile-context"]');
    await act(async () => {
      contextTrigger.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    const contextDialog = window.document.querySelector('[data-testid="dialog-profile-context"]');
    assert.ok(contextDialog);
    assert.ok(contextDialog.textContent.includes("Operations Coordinator · 4 learning hours per week"));
    assert.ok(contextDialog.textContent.includes("regenerate"));
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

import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Router } from "wouter";
import { createServer } from "vite";

const evidence = {
  fetchedAt: "2026-10-23",
  newsStatus: "Fixture snapshot; no live feed requested",
  signals: [{
    id: "fixture-report", title: "Fixture workforce report", source: "Fixture Labor Office",
    url: "https://example.test/report", publishedAt: "2026-08-27", fetchedAt: "2026-10-23",
    scope: "United States · national projections", kind: "labor-market",
    limitation: "Not local vacancies or a guarantee.", roleIds: ["ai-operations-specialist"],
    skills: ["AI workflow design"], weight: 4,
  }],
};
const scenario = (roleTitle, score, fast = false) => ({
  roleTitle, matchScore: score, explainableReason: "Operations skills cover one catalog requirement.",
  skillsGap: fast ? ["AI output evaluation"] : ["SQL fundamentals"], matchedSkills: ["Process mapping"],
  unSdgTag: "SDG 8: Decent Work and Economic Growth", evidenceIds: ["fixture-report"],
  scoreBasis: "Fixture: skills + interests + evidence + adoption assumption; not probability.",
  paceEstimate: "100–150 practice hours; 20–30 weeks at 5 h/week. Not a guarantee.",
  reskillingPathway: Array.from({ length: 3 }, (_, i) => ({
    step: `Practice and portfolio step ${i + 1}`, estimatedHours: 30,
    resourceLink: "https://sqlbolt.com/", resourceTitle: "SQLBolt · SQL lessons",
    cost: "Free", checkedAt: "2026-10-23",
  })),
});
const moderate = ["BI", "AI Operations", "Customer Operations"].map((name, i) => scenario(name, 67 - i * 10));
const fast = ["AI Operations", "BI", "Cyber Risk"].map((name, i) => scenario(name, 77 - i * 10, true));
const pathway = {
  profileId: "00000000-0000-4000-8000-000000000012", generatedAt: "2026-10-23T00:00:00Z",
  scenarios: moderate,
  analysis: {
    model: "Fixture deterministic model; no LLM", profileSummary: "Operations Coordinator · 5 learning h/week",
    limitations: "Estimates, not measured probabilities; check local requirements.",
    evidence, comparisons: [
      { id: "moderate", name: "Moderate adoption", assumptions: "Gradual adoption; human-led process improvement.", scenarios: moderate },
      { id: "fast", name: "Fast adoption", assumptions: "Rapid automation; added evaluation and oversight.", scenarios: fast },
    ],
  },
};

test("demo, comparisons, evidence chain and direct resource metadata render deterministically without a profile or network", async () => {
  const server = await createServer({
    configFile: false, root: fileURLToPath(new URL("..", import.meta.url)), appType: "custom",
    cacheDir: "/tmp/career-evidence-render-vite",
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, hmr: false }, esbuild: { jsx: "automatic" },
    resolve: { dedupe: ["react", "react-dom", "@tanstack/react-query", "wouter"] },
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  const render = (component, props, path = "/pathway?demo=1") =>
    renderToStaticMarkup(createElement(QueryClientProvider, { client },
      createElement(Router, { ssrPath: path }, createElement(component, props))));
  try {
    const { PathwayPage } = await server.ssrLoadModule("/src/pages/PathwayPage.tsx");
    const { RadarPage } = await server.ssrLoadModule("/src/pages/RadarPage.tsx");
    const { AdoptionComparisonPanel } = await server.ssrLoadModule("/src/components/AdoptionComparisonPanel.tsx");
    const { ScenarioCard } = await server.ssrLoadModule("/src/components/ScenarioCard.tsx");
    client.setQueryData(["/api/pathway-demo"], pathway);
    client.setQueryData(["/api/sdgs/skills"], []);
    const html = render(PathwayPage, { profileId: pathway.profileId, profile: null, profileLoading: false });
    for (const text of ["Read-only sample demo", "personal profile is untouched", "Gradual AI adoption", "Faster AI adoption",
      "not probabilities", "Fixture Labor Office",
      "United States", "Aug 27, 2026", "Oct 23, 2026", "Not local vacancies", "SQLBolt", "Free",
      "href=\"https://sqlbolt.com/\"", "href=\"#evidence-fixture-report\"", "5 learning h/week"]) {
      assert.ok(html.includes(text), `Missing ${text}`);
    }
    for (const text of ["How We Score (1-100)", "The Two AI Futures", "Gradual AI:",
      "Faster AI:", "Things to Keep in Mind (Limitations)", "Local context matters:"]) {
      assert.ok(html.includes(text), `Missing plain-language explanation: ${text}`);
    }
    assert.match(html, /data-testid="button-comparison-moderate"[^>]*>[\s\S]*?Gradual AI adoption/);
    assert.ok(!html.includes("empty-pathway-profile"));
    assert.ok(!html.includes("youtube.com/results"));
    assert.ok(!html.includes("row-personalized-reading"));

    const panel = render(AdoptionComparisonPanel, { analysis: pathway.analysis, selectedId: "fast", onSelect: () => {} });
    assert.match(panel, /aria-pressed="true"[^>]*data-testid="button-comparison-fast"/);
    assert.ok(panel.includes("rapid automation of routine tasks"));
    const card = render(ScenarioCard, {
      scenario: fast[0], index: 0, rank: 1, evidence: new Map(evidence.signals.map((s) => [s.id, s])),
    });
    assert.ok(card.includes("AI output evaluation"));
    assert.ok(card.includes("AI Operations"));
    assert.ok(card.includes("href=\"#evidence-fixture-report\""));
    assert.ok(card.includes('data-testid="details-scenario-evidence-0"'));
    assert.ok(card.includes('data-testid="details-scenario-steps-0"'));
    assert.ok(card.includes('type="checkbox"'));
    assert.ok(!card.includes("Score basis:"));
    assert.ok(!card.includes("Fixture: skills + interests + evidence + adoption assumption"));
    assert.ok(!/details[^>]* open/.test(card), "Evidence and learning-step accordions should start collapsed");

    client.setQueryData(["/api/career-evidence"], evidence);
    // Empty live coverage avoids a chart dependency; public evidence still renders.
    client.setQueryData(["/api/trends"], { source: "Fixture RSS", fetchedAt: "2026-10-23T00:00:00Z", trends: [] });
    const radar = render(RadarPage, { profile: null }, "/radar");
    for (const text of ["Fixture Labor Office", "Labor market data", "United States", "Fixture snapshot",
      "href=\"https://example.test/report\"", "/pathway?demo=1"]) assert.ok(radar.includes(text), `Radar missing ${text}`);
    const evidenceStart = radar.indexOf('<details class="evidence-details" data-testid="details-evidence-fixture-report">');
    assert.ok(evidenceStart >= 0, "Evidence citation should use a native collapsible details item");
    const summaryStart = radar.indexOf("<summary", evidenceStart);
    const summaryEnd = radar.indexOf("</summary>", summaryStart);
    const summary = radar.slice(summaryStart, summaryEnd);
    assert.ok(summary.includes("Fixture workforce report"));
    assert.ok(summary.includes("Labor market data"));
    assert.ok(summary.includes("Aug 27, 2026"));
    assert.ok(summary.includes("View details"));
    assert.ok(!summary.includes("Scope:") && !summary.includes("Limitation:"));
    assert.ok(!summary.includes("Fixture Labor Office"), "Full source and scope details should stay collapsed");
    assert.ok(!summary.includes("role: ai-operations-specialist"));
    assert.doesNotMatch(radar.slice(evidenceStart, summaryStart), /<details[^>]* open/);
    assert.ok(radar.slice(summaryEnd).includes("Scope:</strong> United States"));
    assert.ok(radar.slice(summaryEnd).includes("Limitation:</strong> Not local vacancies"));
    assert.ok(radar.slice(summaryEnd).includes('data-testid="link-evidence-fixture-report"'));
    assert.ok(radar.slice(summaryEnd).includes("role: ai-operations-specialist"));

    client.getQueryCache().find({ queryKey: ["/api/pathway-demo"] }).setState({ status: "error", error: new Error("Fixture error") });
    assert.match(render(PathwayPage, { profileId: pathway.profileId, profile: null, profileLoading: false }), /status-pathway-error/);
  } finally {
    client.clear();
    await server.close();
  }
});

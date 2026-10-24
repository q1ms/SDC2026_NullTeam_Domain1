import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

test("career pathways render safe resource links beside steps and preserve legacy saved pathways", async () => {
  const server = await createServer({
    configFile: false,
    root: fileURLToPath(new URL("..", import.meta.url)),
    appType: "custom",
    server: { middlewareMode: true, hmr: false },
    cacheDir: "/tmp/career-pathway-resources-vite-test",
    optimizeDeps: { noDiscovery: true, include: [] },
    esbuild: { jsx: "automatic" },
    resolve: { dedupe: ["react", "react-dom", "@tanstack/react-query"] },
  });
  try {
    const { ScenarioCard } = await server.ssrLoadModule("/src/components/ScenarioCard.tsx");
    const scenario = {
      roleTitle: "AI learning specialist",
      matchScore: 88,
      explainableReason: "This pathway extends the profile's existing experience.",
      skillsGap: ["Data analysis"],
      reskillingPathway: Array.from({ length: 3 }, (_, stepIndex) => ({
        step: `Complete learning step ${stepIndex + 1}`,
        estimatedHours: 8 + stepIndex,
        ...(stepIndex === 1 ? {} : {
          resourceLink: `https://www.edx.org/learn/course-0-${stepIndex}`,
        }),
      })),
      unSdgTag: "SDG 4: Quality Education",
    };
    const html = renderToStaticMarkup(createElement(ScenarioCard, { scenario, index: 0 }));
    assert.match(html, /class="learning-path"/);
    assert.match(html, /href="https:\/\/www\.edx\.org\/learn\/course-0-0"[^>]*target="_blank"[^>]*rel="noopener noreferrer"/);
    assert.match(html, /data-testid="link-scenario-step-resource-0-0"/);
    assert.match(html, /hours<\/span>/);
    assert.match(html, /data-testid="status-scenario-step-resource-0-1"/);
    assert.match(html, /Resource link unavailable/);
    assert.ok(!html.includes("youtube.com/results"));
    assert.equal((html.match(/data-testid="link-scenario-step-resource-/g) ?? []).length, 2);
  } finally {
    await server.close();
  }
});

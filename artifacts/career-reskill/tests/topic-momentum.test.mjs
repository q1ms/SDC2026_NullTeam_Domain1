import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

test("coverage chart groups measured changes, flags only the two largest increases, and never invents a baseline", async () => {
  const server = await createServer({
    configFile: false, root: fileURLToPath(new URL("..", import.meta.url)), appType: "custom",
    cacheDir: "/tmp/career-topic-momentum-tests", optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, hmr: false }, esbuild: { jsx: "automatic" },
    resolve: { dedupe: ["react", "react-dom"] },
  });
  try {
    const { coverageRows, TopicMomentumChart } = await server.ssrLoadModule("/src/components/TopicMomentumChart.tsx");
    const topic = (name, recent, previous, baselineAvailable = true) => ({
      topic: name, mentions: 20, headline: "Fixture headline", summary: "Fixture",
      sourceName: "Fixture News", articleUrl: "https://example.test/article", publishedAt: "2026-10-23T00:00:00Z",
      coverageMomentum: { recentCount: recent, previousCount: previous, baselineAvailable },
    });
    const trends = [
      topic("Stable", 10, 10), topic("Small rise", 2, 1),
      topic("Cooling", 1, 6), topic("Largest", 8, 1), topic("Second", 4, 0),
    ];
    const before = structuredClone(trends);
    const rows = coverageRows(trends);
    assert.deepEqual(rows.map((r) => r.topic), ["Largest", "Second", "Small rise", "Stable", "Cooling"]);
    assert.deepEqual(trends, before);
    const render = (data) => renderToStaticMarkup(createElement(TopicMomentumChart, { trends: data, fetchedAt: "2026-10-24T12:00:00Z" }));
    const html = render(trends);
    assert.equal((html.match(/data-testid="icon-top-rising-topic"/g) ?? []).length, 2);
    for (const copy of ["Emerging / rising coverage", "Stable coverage", "Cooling coverage",
      "7 more stories", "5 fewer stories", "No change in story count", "not hiring demand",
      "zero-based scale", "limited, non-exhaustive sample", "UTC"]) {
      assert.ok(html.includes(copy), `Missing ${copy}`);
    }
    const unknown = render([topic("No baseline", 8, 0, false), { ...topic("Legacy", 3, 0), coverageMomentum: undefined }]);
    assert.doesNotMatch(unknown, /data-testid="icon-top-rising-topic"/);
    assert.match(unknown, /Not enough dated coverage/);
    assert.match(unknown, /Baseline unavailable/);
    const empty = render([topic("No recent stories", 0, 0)]);
    assert.doesNotMatch(empty, /NaN|Infinity/);
    assert.doesNotMatch(render([topic("Only decline", 1, 8)]), /data-testid="icon-top-rising-topic"/);
  } finally { await server.close(); }
});

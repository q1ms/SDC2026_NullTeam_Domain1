import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { build } from "esbuild";

test("RSS momentum uses equal bounded windows, deduplicates links, and preserves live article metadata", async () => {
  const dir = await mkdtemp(resolve(tmpdir(), "coverage-momentum-"));
  const previousFetch = globalThis.fetch;
  try {
    const output = resolve(dir, "fixture.mjs");
    await build({
      stdin: { contents: 'export * from "./src/lib/coverage-momentum"; export * from "./src/lib/live-trends"; export { GetLiveTrendsResponse } from "@workspace/api-zod";',
        resolveDir: fileURLToPath(new URL("..", import.meta.url)), loader: "ts" },
      outfile: output, bundle: true, platform: "node", format: "esm", logLevel: "silent",
    });
    const { summarizeCoverage, getLiveTrends, GetLiveTrendsResponse } = await import(pathToFileURL(output).href);
    const now = new Date("2026-10-24T12:00:00Z");
    const date = (days) => new Date(now.getTime() - days * 86400000);
    const dates = [date(-1), date(0), date(6), date(7), date(8), date(14), date(15), new Date("bad")];
    assert.deepEqual(summarizeCoverage(dates, dates, now), {
      recentCount: 3, previousCount: 2, baselineAvailable: true,
    });
    assert.deepEqual(summarizeCoverage([date(2)], [date(2)], now), {
      recentCount: 1, previousCount: 0, baselineAvailable: false,
    });
    assert.deepEqual(summarizeCoverage([], [date(8)], now), {
      recentCount: 0, previousCount: 0, baselineAvailable: true,
    });

    const current = Date.now();
    const item = (title, id, days) => `<item><title>${title}</title><link>https://example.test/${id}</link><pubDate>${new Date(current - days * 86400000).toUTCString()}</pubDate><source>Fixture News</source></item>`;
    const xml = `<rss><channel>${[
      item("AI agents automation", "agents-a", 1),
      item("AI agents automation", "agents-a", 1),
      item("AI agents automation", "agents-b", 2),
      item("AI agents automation", "agents-old", 8),
      item("Generative AI", "gen", 3),
      item("AI safety regulation", "policy", 8),
      item("AI healthcare", "health", 9),
      item("AI education", "education", 10),
    ].join("")}</channel></rss>`;
    globalThis.fetch = async () => ({ ok: true, text: async () => xml });
    const result = GetLiveTrendsResponse.parse(await getLiveTrends());
    const agents = result.trends.find((t) => t.topic === "AI agents & workflow automation");
    assert.equal(result.trends.length, 5);
    assert.equal(agents.mentions, 3, "duplicate feed URL counts once");
    assert.deepEqual(agents.coverageMomentum, { recentCount: 2, previousCount: 1, baselineAvailable: true });
    for (const trend of result.trends) {
      assert.equal(trend.sourceName, "Fixture News");
      assert.ok(trend.publishedAt instanceof Date);
      assert.ok(trend.articleUrl.startsWith("https://example.test/"));
    }
    assert.equal(result.trends.find((t) => t.topic === "AI safety & regulation").coverageMomentum.recentCount, 0);
  } finally {
    globalThis.fetch = previousFetch;
    await rm(dir, { recursive: true, force: true });
  }
});

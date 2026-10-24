import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createServer } from "vite";

test("reading UI renders real metadata and explicit loading, error and no-match states", async () => {
  // Compile components in memory without starting a server or making API requests.
  const server = await createServer({
    configFile: false,
    root: fileURLToPath(new URL("..", import.meta.url)),
    appType: "custom",
    cacheDir: "/tmp/career-reskill-reading-tests-vite",
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, hmr: false },
    esbuild: { jsx: "automatic" },
    resolve: { dedupe: ["react", "react-dom", "@tanstack/react-query"] },
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  try {
    const { PersonalizedReading } = await server.ssrLoadModule("/src/components/PersonalizedReading.tsx");
    const profile = {
      industry: "Healthcare", currentRole: "Nurse", interests: ["AI & automation"],
      skills: [], yearsExperience: 3, weeklyHours: 4,
    };
    const render = () => renderToStaticMarkup(createElement(QueryClientProvider, { client },
      createElement(PersonalizedReading, { profile })));
    assert.match(render(), /status-reading-loading/);
    const feed = {
      source: "Google News RSS", fetchedAt: "2026-10-23T10:00:00Z", feedUrl: "https://example.test/rss",
      trends: [{
        topic: "Healthcare", headline: "Nurse training", summary: "AI tools for healthcare.",
        sourceName: "Example News", articleUrl: "https://example.test/article",
        publishedAt: "2026-10-23T09:00:00Z", mentions: 1,
        imageUrl: "https://images.example.test/nurse-training.jpg",
      }],
    };
    client.setQueryData(["/api/trends"], feed);
    const matched = render();
    for (const value of ["row-personalized-reading-0", "Example News", feed.trends[0].publishedAt,
      feed.trends[0].articleUrl, "Nurse", "Healthcare", "AI &amp; automation"]) {
      assert.ok(matched.includes(value), `Expected rendered reading to include ${value}`);
    }
    assert.match(matched, /class="coverage-item has-image"/);
    assert.match(matched, /src="https:\/\/images\.example\.test\/nurse-training\.jpg"/);
    assert.match(matched, /loading="lazy"/);
    client.setQueryData(["/api/trends"], { ...feed, trends: [] });
    assert.match(render(), /empty-personalized-reading/);
    client.getQueryCache().find({ queryKey: ["/api/trends"] }).setState({
      status: "error", error: new Error("Synthetic feed failure"),
    });
    assert.match(render(), /status-reading-error/);
    assert.match(render(), /button-refresh-personalized-reading/);
  } finally {
    client.clear();
    await server.close();
  }
});

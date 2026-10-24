import assert from "node:assert/strict";
import { test } from "node:test";
import { extractOpenGraphImageUrl, resolveGoogleNewsImageUrl } from "../src/lib/article-images.ts";

test("extracts secure Open Graph images regardless of meta attribute order", () => {
  const imageUrl = "https://lh3.googleusercontent.com/article-image.jpg?width=640&crop=1";
  const html = `<html><meta content="${imageUrl.replaceAll("&", "&amp;")}" property="og:image"></html>`;
  assert.equal(extractOpenGraphImageUrl(html), imageUrl);
  assert.equal(extractOpenGraphImageUrl('<meta property="og:image" content="http://images.example.test/photo.jpg">'), undefined);
  assert.equal(extractOpenGraphImageUrl('<meta property="og:image" content="javascript:alert(1)">'), undefined);
  assert.equal(extractOpenGraphImageUrl("<html>No article image</html>"), undefined);
});

test("resolves images from Google News pages without following redirects to other hosts", async () => {
  const requestedUrls = [];
  const imageUrl = "https://lh3.googleusercontent.com/article-image.jpg";
  const fetchImpl = async (url, options) => {
    requestedUrls.push({ url, options });
    if (requestedUrls.length === 1) {
      return new Response(null, { status: 302, headers: { location: "/rss/articles/example?hl=en" } });
    }
    return new Response(`<meta property="og:image" content="${imageUrl}">`, {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  };

  assert.equal(
    await resolveGoogleNewsImageUrl("https://news.google.com/rss/articles/example?oc=5", fetchImpl),
    imageUrl,
  );
  assert.equal(requestedUrls.length, 2);
  assert.ok(requestedUrls.every(({ url, options }) => new URL(url).hostname === "news.google.com" && options.redirect === "manual"));

  let blockedRedirectRequests = 0;
  const blocked = await resolveGoogleNewsImageUrl(
    "https://news.google.com/rss/articles/example",
    async () => {
      blockedRedirectRequests += 1;
      return new Response(null, { status: 302, headers: { location: "http://127.0.0.1/internal" } });
    },
  );
  assert.equal(blocked, undefined);
  assert.equal(blockedRedirectRequests, 1);
});

test("treats unavailable or non-HTML article previews as optional", async () => {
  const url = "https://news.google.com/rss/articles/example";
  const nonHtml = await resolveGoogleNewsImageUrl(url, async () =>
    new Response("not an article page", { status: 200, headers: { "content-type": "text/plain" } }),
  );
  assert.equal(nonHtml, undefined);

  const noImage = await resolveGoogleNewsImageUrl(url, async () =>
    new Response("<html><title>Article</title></html>", { status: 200, headers: { "content-type": "text/html" } }),
  );
  assert.equal(noImage, undefined);

  const nonGoogle = await resolveGoogleNewsImageUrl("https://example.test/article", async () => {
    throw new Error("Must not fetch a non-Google article link");
  });
  assert.equal(nonGoogle, undefined);
});

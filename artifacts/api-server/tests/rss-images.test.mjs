import assert from "node:assert/strict";
import { test } from "node:test";
import {
  extractRssImageUrl,
  FALLBACK_ARTICLE_IMAGE_URL,
  FALLBACK_ARTICLE_IMAGE_URLS,
  getTopicFallbackImageUrl,
  resolveRssImageUrl,
} from "../src/lib/rss-images.ts";

test("reads image URLs from RSS media thumbnails, image content, and enclosures", () => {
  assert.equal(
    extractRssImageUrl({ "media:thumbnail": { "@_url": "https://cdn.example.test/story.webp" } }),
    "https://cdn.example.test/story.webp",
  );
  assert.equal(
    extractRssImageUrl({ "media:content": { "@_url": "https://cdn.example.test/story", "@_type": "image/jpeg" } }),
    "https://cdn.example.test/story",
  );
  assert.equal(
    extractRssImageUrl({ enclosure: { "@_url": "https://cdn.example.test/story.jpg", "@_type": "image/jpeg" } }),
    "https://cdn.example.test/story.jpg",
  );
});

test("extracts a publisher image embedded in RSS descriptions", () => {
  assert.equal(
    extractRssImageUrl({ description: '<p>Story text</p><img src="https://cdn.example.test/story.png" alt="Story">' }),
    "https://cdn.example.test/story.png",
  );
});

test("ignores unsafe, non-image and absent RSS media", () => {
  assert.equal(
    extractRssImageUrl({ enclosure: { "@_url": "https://cdn.example.test/story.mp4", "@_type": "video/mp4" } }),
    undefined,
  );
  assert.equal(
    extractRssImageUrl({ "media:content": { "@_url": "http://cdn.example.test/story.jpg" } }),
    undefined,
  );
  assert.equal(
    extractRssImageUrl({ "media:thumbnail": { "@_url": "javascript:alert(1)" } }),
    undefined,
  );
  assert.equal(extractRssImageUrl({ title: "No image here" }), undefined);
});

test("uses the polished AI placeholder whenever an article has no safe thumbnail", () => {
  assert.equal(resolveRssImageUrl({ title: "No image here" }, "Generative AI & copilots", new Set()), FALLBACK_ARTICLE_IMAGE_URL);
  assert.equal(
    resolveRssImageUrl({ "media:thumbnail": { "@_url": "javascript:alert(1)" } }, "Generative AI & copilots", new Set()),
    FALLBACK_ARTICLE_IMAGE_URL,
  );
  assert.equal(
    resolveRssImageUrl({ "media:thumbnail": { "@_url": "https://cdn.example.test/story.jpg" } }, "Generative AI & copilots", new Set()),
    "https://cdn.example.test/story.jpg",
  );
});

test("assigns distinct topic images and avoids repeats for unknown topic labels", () => {
  const usedFallbackImages = new Set();
  const urls = [
    getTopicFallbackImageUrl("AI skills & workforce shifts", usedFallbackImages),
    getTopicFallbackImageUrl("Robotics & autonomous systems", usedFallbackImages),
    getTopicFallbackImageUrl("Custom AI headline", usedFallbackImages),
    getTopicFallbackImageUrl("Another custom AI headline", usedFallbackImages),
  ];
  assert.equal(new Set(urls).size, urls.length);
  assert.equal(Object.keys(FALLBACK_ARTICLE_IMAGE_URLS).length, 9);
});

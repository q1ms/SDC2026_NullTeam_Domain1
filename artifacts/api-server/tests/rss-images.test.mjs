import assert from "node:assert/strict";
import { test } from "node:test";
import { extractRssImageUrl } from "../src/lib/rss-images.ts";

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

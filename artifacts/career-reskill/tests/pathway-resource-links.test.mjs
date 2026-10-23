import assert from "node:assert/strict";
import { test } from "node:test";
import {
  getLearningResourceLink,
  isAllowedLearningResourceUrl,
} from "../src/lib/pathway-resource-links.ts";

test("keeps links from trusted HTTPS learning providers", () => {
  const resourceLink = "https://www.edx.org/learn/data-science";
  assert.equal(isAllowedLearningResourceUrl(resourceLink), true);
  assert.deepEqual(getLearningResourceLink("Learn data science", resourceLink), {
    href: resourceLink,
    label: "View resource",
  });
});

test("uses a step-specific YouTube search for existing pathways without a resource link", () => {
  const step = "Learn SQL & data modeling";
  const resource = getLearningResourceLink(step);
  assert.equal(resource.href, `https://www.youtube.com/results?search_query=${encodeURIComponent(step)}`);
  assert.equal(resource.label, "Search resources");
});

test("never presents unsafe or unapproved stored links as resources", () => {
  for (const unsafe of [
    "javascript:alert(1)",
    "http://www.edx.org/course",
    "https://youtube.com.evil.example/watch",
    "https://coursera.org@evil.example/course",
  ]) {
    assert.equal(isAllowedLearningResourceUrl(unsafe), false);
    assert.equal(getLearningResourceLink("Learn AI", unsafe).label, "Search resources");
  }
});

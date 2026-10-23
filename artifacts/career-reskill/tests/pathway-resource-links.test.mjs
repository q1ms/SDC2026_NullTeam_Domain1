import assert from "node:assert/strict";
import { test } from "node:test";
import { getLearningResourceLink } from "../src/lib/pathway-resource-links.ts";

test("keeps arbitrary nonblank resource-link strings", () => {
  const resourceLink = "not a standard URL but still a resource";
  assert.deepEqual(getLearningResourceLink("Learn data science", resourceLink), {
    href: resourceLink,
    label: "View resource",
  });
});

test("uses a step-specific YouTube search when no resource link is available", () => {
  const step = "Learn SQL & data modeling";
  for (const missing of [undefined, "", "   ", "javascript:alert(1)"]) {
    const resource = getLearningResourceLink(step, missing);
    assert.equal(resource.href, `https://www.youtube.com/results?search_query=${encodeURIComponent(step)}`);
    assert.equal(resource.label, "Search resources");
  }
});

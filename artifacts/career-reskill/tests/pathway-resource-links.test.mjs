import assert from "node:assert/strict";
import { test } from "node:test";
import { getLearningResourceLink } from "../src/lib/pathway-resource-links.ts";

test("only opens direct secure links; unsafe, missing and search resources are explicitly unavailable", () => {
  for (const candidate of [undefined, "", "not a URL", "http://example.test", "javascript:alert(1)",
    "//example.test", "https://www.youtube.com/results?search_query=sql", "https://example.test/search?q=sql"]) {
    const resource = getLearningResourceLink(candidate);
    assert.equal(resource.available, false, `${candidate} must not become a link`);
    assert.match(resource.reason, /unavailable/);
    assert.equal(resource.href, undefined);
  }
  assert.deepEqual(getLearningResourceLink("https://sqlbolt.com/", "SQLBolt · SQL lessons"), {
    available: true, href: "https://sqlbolt.com/", label: "SQLBolt · SQL lessons",
  });
});

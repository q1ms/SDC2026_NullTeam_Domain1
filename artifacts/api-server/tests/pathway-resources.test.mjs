import assert from "node:assert/strict";
import { test } from "node:test";
import { hasPathwayResourceLinks, isPathwayResourceUrl } from "../src/lib/pathway-resources.ts";

const link = "https://www.coursera.org/learn/ai-for-everyone";
const scenarios = () => Array.from({ length: 3 }, (_, scenarioIndex) => ({
  reskillingPathway: Array.from({ length: 3 }, (_, stepIndex) => ({
    step: `Scenario ${scenarioIndex + 1}, step ${stepIndex + 1}`,
    estimatedHours: 5,
    resourceLink: link,
  })),
}));

test("accepts HTTPS links from the named learning providers and their subdomains", () => {
  for (const url of [
    link,
    "https://courses.edx.org/learn/example",
    "https://www.freecodecamp.org/learn",
    "https://www.youtube.com/results?search_query=ai+course",
    "https://youtu.be/dQw4w9WgXcQ",
    "https://www.khanacademy.org/computing",
  ]) {
    assert.equal(isPathwayResourceUrl(url), true, url);
  }
});

test("rejects insecure, malformed, credentialed, oversized and lookalike-host URLs", () => {
  for (const url of [
    "javascript:alert(1)",
    "http://www.coursera.org/course",
    "https://coursera.org.evil.test/course",
    "https://coursera.org@evil.test/course",
    "https://user@coursera.org/course",
    "not a URL",
    `https://coursera.org/${"x".repeat(2048)}`,
  ]) {
    assert.equal(isPathwayResourceUrl(url), false, url.slice(0, 80));
  }
});

test("requires exactly three scenarios with three trusted learning links apiece", () => {
  assert.equal(hasPathwayResourceLinks({ scenarios: scenarios() }), true);
  assert.equal(hasPathwayResourceLinks({ scenarios: scenarios().slice(0, 2) }), false);
  const missingLink = scenarios();
  delete missingLink[1].reskillingPathway[2].resourceLink;
  assert.equal(hasPathwayResourceLinks({ scenarios: missingLink }), false);
  const unsafeLink = scenarios();
  unsafeLink[0].reskillingPathway[0].resourceLink = "https://unexpected.example/resource";
  assert.equal(hasPathwayResourceLinks({ scenarios: unsafeLink }), false);
  const shortPathway = scenarios();
  shortPathway[0].reskillingPathway.pop();
  assert.equal(hasPathwayResourceLinks({ scenarios: shortPathway }), false);
});

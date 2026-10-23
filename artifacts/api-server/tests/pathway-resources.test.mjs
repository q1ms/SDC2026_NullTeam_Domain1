import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizePathwayResourceLinks } from "../src/lib/pathway-resources.ts";

const scenarios = () => Array.from({ length: 3 }, (_, scenarioIndex) => ({
  roleTitle: `Role ${scenarioIndex + 1}`,
  reskillingPathway: Array.from({ length: 3 }, (_, stepIndex) => ({
    step: `Scenario ${scenarioIndex + 1}, step ${stepIndex + 1}`,
    estimatedHours: 5,
  })),
}));

test("preserves any nonblank resourceLink string without URL or provider checks", () => {
  const links = [
    "not a URL",
    "ftp://somewhere.example/course",
    "https://unexpected.example/resource",
    "javascript:alert(1)",
  ];
  const output = { scenarios: scenarios() };
  const steps = output.scenarios.flatMap((scenario) => scenario.reskillingPathway);
  links.forEach((resourceLink, index) => {
    steps[index].resourceLink = resourceLink;
  });

  const normalized = normalizePathwayResourceLinks(output);
  const normalizedSteps = normalized.scenarios.flatMap((scenario) => scenario.reskillingPathway);
  assert.deepEqual(
    normalizedSteps.slice(0, links.length).map((step) => step.resourceLink),
    links,
  );
});

test("fills missing, blank, and non-string resource links with a step-specific YouTube search", () => {
  const output = { scenarios: scenarios() };
  const steps = output.scenarios.flatMap((scenario) => scenario.reskillingPathway);
  delete steps[0].resourceLink;
  steps[1].resourceLink = "";
  steps[2].resourceLink = "  ";
  steps[3].resourceLink = null;
  steps[4].resourceLink = 42;

  const normalized = normalizePathwayResourceLinks(output);
  const normalizedSteps = normalized.scenarios.flatMap((scenario) => scenario.reskillingPathway);
  for (const step of normalizedSteps.slice(0, 5)) {
    assert.equal(
      step.resourceLink,
      `https://www.youtube.com/results?search_query=${encodeURIComponent(step.step)}`,
    );
  }
});

test("uses description when the usual step text is absent", () => {
  const output = {
    scenarios: [{
      reskillingPathway: [{
        description: "Learn data modeling & SQL",
        estimatedHours: 5,
        resourceLink: null,
      }],
    }],
  };

  const normalized = normalizePathwayResourceLinks(output);
  assert.equal(
    normalized.scenarios[0].reskillingPathway[0].resourceLink,
    `https://www.youtube.com/results?search_query=${encodeURIComponent("Learn data modeling & SQL")}`,
  );
});

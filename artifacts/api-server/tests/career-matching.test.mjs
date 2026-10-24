import assert from "node:assert/strict";
import { after, test } from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { build } from "esbuild";

// Bundle TS in memory/on a disposable filesystem, with no real database or network.
const dir = await mkdtemp(resolve(tmpdir(), "career-model-tests-"));
const root = fileURLToPath(new URL("..", import.meta.url));
process.env.CAREER_DB_PATH = resolve(dir, "fixture.sqlite");
await build({
  stdin: {
    contents: `
      export * from "./src/lib/career-matching";
      export * from "./src/lib/career-signals";
      export * from "./src/lib/career-learning";
      export * from "./src/lib/career-seed";
      export * from "./src/lib/career-db";
      export { GeneratePathwayResponse } from "@workspace/api-zod";
    `,
    resolveDir: root,
  },
  outfile: resolve(dir, "model.mjs"), bundle: true, platform: "node", format: "esm",
});
const {
  buildPathway, DEMO_PROFILE, curatedEvidence, mapNewsSignals, getCareerEvidence,
  JOB_ROLES, GeneratePathwayResponse, LEARNING_RESOURCES,
  saveCareerProfile, saveGeneratedPathway, getGeneratedPathway,
} = await import(pathToFileURL(resolve(dir, "model.mjs")));
after(async () => { await rm(dir, { recursive: true, force: true }); });
const id = "00000000-0000-4000-8000-000000000012";
const date = "2026-10-23T00:00:00.000Z";
const generate = (profile = DEMO_PROFILE, evidence = curatedEvidence()) =>
  buildPathway(id, profile, JOB_ROLES, evidence, date);

test("sample reproducibly changes catalog-grounded rankings and gaps across named assumptions", () => {
  const result = GeneratePathwayResponse.parse(generate());
  assert.deepEqual(result, GeneratePathwayResponse.parse(generate()));
  const [moderate, fast] = result.analysis.comparisons;
  assert.equal(moderate.name, "Moderate adoption");
  assert.equal(fast.name, "Fast adoption");
  assert.equal(moderate.scenarios[0].roleTitle, "Business Intelligence Analyst");
  assert.equal(fast.scenarios[0].roleTitle, "AI Operations Specialist");
  assert.deepEqual(result.scenarios, moderate.scenarios);
  for (const comparison of [moderate, fast]) {
    assert.equal(new Set(comparison.scenarios.map((s) => s.roleTitle)).size, 3);
    for (const scenario of comparison.scenarios) {
      assert.ok(JOB_ROLES.some((role) => role.title === scenario.roleTitle));
      assert.ok(scenario.matchScore > 0 && scenario.matchScore <= 95);
      assert.match(scenario.scoreBasis, /not probability/);
      assert.match(scenario.explainableReason, /Operations Coordinator/);
      for (const evidenceId of scenario.evidenceIds) {
        assert.ok(result.analysis.evidence.signals.some((signal) => signal.id === evidenceId));
      }
    }
  }
  const bi = (comparison) => comparison.scenarios.find((s) => s.roleTitle === "Business Intelligence Analyst");
  assert.ok(!bi(moderate).skillsGap.includes("AI output evaluation"));
  assert.ok(bi(fast).skillsGap.includes("AI output evaluation"));
});

test("profile skills and interests affect match scores; current role text is not a hidden qualification score", () => {
  const baseline = generate();
  const changed = generate({ ...DEMO_PROFILE, skills: ["SQL", "Data visualization", "Business storytelling", "Metric design"] });
  assert.ok(changed.scenarios[0].matchScore > baseline.scenarios[0].matchScore);
  assert.deepEqual(changed.scenarios[0].skillsGap, []);
  const noInterests = generate({ ...DEMO_PROFILE, interests: [] });
  assert.ok(noInterests.scenarios[0].matchScore < baseline.scenarios[0].matchScore);
  assert.deepEqual(generate({ ...DEMO_PROFILE, currentRole: "Invented title" }).scenarios.map((s) => s.matchScore),
    baseline.scenarios.map((s) => s.matchScore));
});

test("source changes alter recommendations with a traceable exact score contribution", () => {
  const evidence = curatedEvidence();
  const withEvidence = generate();
  const noSurvey = generate(DEMO_PROFILE, { ...evidence, signals: evidence.signals.filter((s) => s.id !== "wef-skills-2025") });
  const bi = (result) => result.scenarios.find((s) => s.roleTitle === "Business Intelligence Analyst");
  assert.equal(bi(withEvidence).matchScore - bi(noSurvey).matchScore, 4);
  assert.ok(bi(withEvidence).evidenceIds.includes("wef-skills-2025"));
  assert.ok(!bi(noSurvey).evidenceIds.includes("wef-skills-2025"));
});

const newsFeed = (mentions = 1, publishedAt = "2026-10-22T10:00:00Z") => ({
  source: "Fixture RSS", feedUrl: "https://example.test/rss", fetchedAt: new Date(date),
  trends: [{
    topic: "AI agents & workflow automation", headline: "Fixture automation coverage",
    sourceName: "Fixture News", articleUrl: "https://example.test/story",
    summary: "Fixture story, not hiring evidence", publishedAt: new Date(publishedAt), mentions,
  }],
});
test("news is dated attributed context, bounded at two points and independent of mention volume", () => {
  const mapped = mapNewsSignals(newsFeed(), new Date(date));
  assert.equal(mapped[0].kind, "news");
  assert.equal(mapped[0].source, "Fixture News");
  assert.match(mapped[0].scope, /US edition/);
  assert.match(mapped[0].limitation, /not job demand/);
  assert.deepEqual(mapped, mapNewsSignals(newsFeed(99999), new Date(date)));
  const signals = [...curatedEvidence().signals, ...Array.from({ length: 10 }, (_, i) => ({ ...mapped[0], id: `fixture-${i}` }))];
  const extraNews = generate(DEMO_PROFILE, { ...curatedEvidence(), signals });
  const ai = (result) => result.scenarios.find((s) => s.roleTitle === "AI Operations Specialist");
  assert.equal(ai(extraNews).matchScore - ai(generate()).matchScore, 2);
  assert.deepEqual(mapNewsSignals(newsFeed(1, "2020-01-01"), new Date(date)), []);
  assert.deepEqual(mapNewsSignals(newsFeed(1, "2030-01-01"), new Date(date)), []);
});

test("reviewed evidence is fully attributed and outages use an explicit non-live fallback", async () => {
  const snapshot = await getCareerEvidence(async () => { throw new Error("Offline fixture"); });
  assert.match(snapshot.newsStatus, /unavailable.*reviewed public evidence/);
  assert.ok(snapshot.signals.some((s) => s.kind === "labor-market"));
  assert.ok(snapshot.signals.every((s) => s.kind !== "news"));
  for (const signal of snapshot.signals) {
    for (const key of ["source", "url", "publishedAt", "fetchedAt", "scope", "limitation"]) assert.ok(signal[key]);
    assert.ok(signal.roleIds.every((roleId) => JOB_ROLES.some((role) => role.id === roleId)));
  }
});

test("direct checked free resources and realistic effort are complete; availability changes pace not scores", () => {
  const fastLearner = generate({ ...DEMO_PROFILE, weeklyHours: 10 });
  const slowLearner = generate({ ...DEMO_PROFILE, weeklyHours: 5 });
  for (const comparison of slowLearner.analysis.comparisons) {
    for (const scenario of comparison.scenarios) {
      assert.equal(scenario.reskillingPathway.length, 3);
      for (const step of scenario.reskillingPathway) {
        assert.ok(Object.values(LEARNING_RESOURCES).some((r) => r.resourceLink === step.resourceLink));
        assert.equal(new URL(step.resourceLink).protocol, "https:");
        assert.ok(!step.resourceLink.includes("search"));
        assert.match(step.cost, /Free/);
        assert.equal(step.checkedAt, "2026-10-23");
        assert.ok(step.estimatedHours >= 20);
      }
      assert.match(scenario.paceEstimate, /portfolio work.*5 h\/week.*not job readiness/);
    }
  }
  assert.equal(slowLearner.scenarios[0].matchScore, fastLearner.scenarios[0].matchScore);
  assert.match(slowLearner.scenarios[0].paceEstimate, /20–30 weeks/);
  assert.match(fastLearner.scenarios[0].paceEstimate, /10–15 weeks/);
});

test("output validation rejects malformed scores, resource effort, and incomplete comparisons", () => {
  for (const mutate of [
    (result) => { result.scenarios[0].matchScore = 101; },
    (result) => { result.scenarios[0].reskillingPathway[0].estimatedHours = -1; },
    (result) => { result.analysis.comparisons.pop(); },
  ]) {
    const result = structuredClone(generate());
    mutate(result);
    assert.equal(GeneratePathwayResponse.safeParse(result).success, false);
  }
});

test("evidence, assumptions and resource metadata survive persistence; legacy records remain readable", () => {
  saveCareerProfile(id, DEMO_PROFILE);
  const result = generate();
  saveGeneratedPathway(id, result.scenarios, result.analysis);
  const stored = getGeneratedPathway(id);
  assert.deepEqual(stored.analysis, result.analysis);
  assert.deepEqual(stored.scenarios, result.scenarios);
  saveGeneratedPathway(id, result.scenarios);
  assert.equal(getGeneratedPathway(id).analysis, undefined);
  assert.ok(GeneratePathwayResponse.safeParse(getGeneratedPathway(id)).success);
});

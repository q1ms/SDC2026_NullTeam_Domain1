import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { getLearningResource, getMatchExplanation, getScenarioSummary, getResourcePlanLines, resolveRoleTitle } from './career-explain.ts';
import { calculateFit, rankRoles, rolesFromCsv, skillsMatch, STARTER_SKILLS } from './career-model.ts';

const roles = rolesFromCsv(readFileSync(new URL('../../public/data/ai-job-trends.csv', import.meta.url), 'utf8'));

test('explanation links and displayed fit always agree with the real ranking', () => {
  for (const scenario of ['moderate', 'fast'] as const) {
    for (const role of rankRoles(roles, STARTER_SKILLS, scenario)) {
      const explanation = getMatchExplanation(role, STARTER_SKILLS);
      assert.equal(explanation.breakdown.score, role.match);
      assert.equal(explanation.covered, role.matches.length);
      assert.equal(explanation.connections.filter((item) => item.kind === 'gap').length, role.missing.length);
      for (const row of explanation.connections) {
        assert.deepEqual(row.currentMatches, STARTER_SKILLS.filter((current) => skillsMatch(current, row.required)));
      }
    }
  }
});

test('exact, partial and unmet requirements are explicitly distinguished', () => {
  const base = roles.find((role) => role.title === 'Renewable Energy Analyst')!;
  const [role] = rankRoles([base], ['data', 'GIS'], 'moderate');
  const explanation = getMatchExplanation(role, ['data', 'GIS']);
  assert.equal(explanation.connections.find((item) => item.required === 'data analysis')?.kind, 'related');
  assert.equal(explanation.connections.find((item) => item.required === 'GIS')?.kind, 'exact');
  assert.equal(explanation.connections.find((item) => item.required === 'energy systems')?.kind, 'gap');
  assert.equal(explanation.coverage, 50);
  assert.notEqual(explanation.coverage, role.match);
});

test('empty profiles do not show invented matches or confidence', () => {
  const [role] = rankRoles(roles, [], 'fast');
  const explanation = getMatchExplanation(role, []);
  assert.equal(explanation.coverage, 0);
  assert.equal(explanation.breakdown.score, 0);
  assert.ok(explanation.connections.every((item) => item.kind === 'gap' && !item.currentMatches.length));
  assert.match(explanation.note, /not AI confidence/i);
});

test('the shared fit calculation retains its cap and zero-profile behavior', () => {
  assert.equal(calculateFit(4, 4, 30, 100).score, 96);
  assert.equal(calculateFit(4, 0, 0, 100).score, 0);
  assert.equal(calculateFit(4, 2, 6, 82).score, 61);
});

test('before/after summaries use the same live dataset and skill profile', () => {
  for (const scenario of ['moderate', 'fast'] as const) {
    const summary = getScenarioSummary(roles, STARTER_SKILLS, scenario);
    const ranked = rankRoles(roles, STARTER_SKILLS, scenario);
    assert.equal(summary.roles, 14);
    assert.equal(summary.growing + summary.declining + summary.stable, summary.roles);
    assert.equal(summary.declining, 2);
    assert.equal(summary.readiness, Math.round(ranked.slice(0, 5).reduce((sum, role) => sum + role.match, 0) / 5));
  }
  assert.equal(getScenarioSummary([], [], 'fast').readiness, 0);
});

test('resources support exact tutorials and safely encoded arbitrary CSV skills', () => {
  assert.equal(getLearningResource(' SQL ').url, 'https://sqlbolt.com/');
  assert.match(getLearningResource('GIS').url, /^https:\/\/docs\.qgis\.org\//);
  const arbitrary = 'AI policy & risk / governance?';
  const resource = getLearningResource(arbitrary);
  assert.equal(resource.kind, 'Course search');
  assert.equal(new URL(resource.url).searchParams.get('query'), arbitrary);
  assert.ok(roles.flatMap((role) => role.skills).every((skill) => new URL(getLearningResource(skill).url).protocol === 'https:'));
});

test('a fully covered role has no fake gaps to fill with course steps', () => {
  const base = roles[0];
  const [role] = rankRoles([base], base.skills, 'moderate');
  const explanation = getMatchExplanation(role, base.skills);
  assert.equal(explanation.coverage, 100);
  assert.equal(role.missing.length, 0);
  assert.ok(explanation.connections.every((item) => item.kind === 'exact'));
  assert.deepEqual(getResourcePlanLines(role), []);
});

test('downloaded resource steps follow the same gap order and URLs as the timeline', () => {
  const [role] = rankRoles([roles.find((item) => item.title === 'Renewable Energy Analyst')!], STARTER_SKILLS, 'moderate');
  const lines = getResourcePlanLines(role);
  assert.equal(lines.length, role.missing.length * 2);
  role.missing.forEach((skill, index) => {
    assert.ok(lines[index * 2].includes(getLearningResource(skill).url));
    assert.ok(lines[index * 2 + 1].includes(`Missing skill: ${skill}`));
  });
});

test('AI role cards resolve only unambiguous dataset identities', () => {
  assert.equal(resolveRoleTitle(roles, ' renewable energy analyst ')?.title, 'Renewable Energy Analyst');
  assert.equal(resolveRoleTitle(roles, 'Renewable Energy')?.title, 'Renewable Energy Analyst');
  assert.equal(resolveRoleTitle(roles, 'Analyst'), undefined);
  assert.equal(resolveRoleTitle(roles, ''), undefined);
  assert.equal(resolveRoleTitle(roles, 'Unknown role'), undefined);
});

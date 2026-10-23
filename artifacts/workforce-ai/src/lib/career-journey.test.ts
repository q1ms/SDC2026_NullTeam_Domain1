import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { getJourneyReadiness, getRecommendedRoles, getSelectedRecommendation } from './career-journey.ts';
import { rankRoles, rolesFromCsv, STARTER_SKILLS } from './career-model.ts';

const roles = rolesFromCsv(readFileSync(new URL('../../public/data/ai-job-trends.csv', import.meta.url), 'utf8'));

test('the journey shows at most three roles and never invents skills for an empty profile', () => {
  assert.deepEqual(getRecommendedRoles(roles, [], 'moderate'), []);
  assert.deepEqual(getRecommendedRoles(roles, ['  '], 'fast'), []);
  assert.equal(getRecommendedRoles(roles, STARTER_SKILLS, 'moderate').length, 3);
  assert.equal(getRecommendedRoles(roles.slice(0, 2), STARTER_SKILLS, 'moderate').length, 2);
});

test('bundled recommendations actually replace at-risk roles when Fast is selected', () => {
  const moderate = getRecommendedRoles(roles, STARTER_SKILLS, 'moderate');
  const fast = getRecommendedRoles(roles, STARTER_SKILLS, 'fast');
  assert.ok(moderate.some((role) => role.growth < 0));
  assert.ok(fast.every((role) => role.growth >= 0));
  assert.notDeepEqual(moderate.map((role) => role.id), fast.map((role) => role.id));
  for (const role of fast) {
    const source = roles.find((item) => item.id === role.id)!;
    assert.equal(role.growth, source.fastGrowth);
    assert.equal(role.resilience, source.fastResilience);
  }
});

test('Fast applies the viability filter before limiting the result to three', () => {
  const fast = getRecommendedRoles(roles, STARTER_SKILLS, 'fast');
  const expected = rankRoles(roles, STARTER_SKILLS, 'fast').filter((role) => role.growth >= 0).slice(0, 3);
  assert.deepEqual(fast, expected);
});

test('selection is preserved only while still in the current shortlist', () => {
  const moderate = getRecommendedRoles(roles, STARTER_SKILLS, 'moderate');
  const fast = getRecommendedRoles(roles, STARTER_SKILLS, 'fast');
  const departing = moderate.find((role) => !fast.some((item) => item.id === role.id))!;
  assert.equal(getSelectedRecommendation(moderate, departing.id)?.id, departing.id);
  assert.equal(getSelectedRecommendation(fast, departing.id)?.id, fast[0].id);
  assert.equal(getSelectedRecommendation(fast, fast[1].id)?.id, fast[1].id);
  assert.equal(getSelectedRecommendation([], departing.id), null);
  assert.equal(getSelectedRecommendation(fast, null)?.id, fast[0].id);
});

test('all-negative imported Fast projections produce an honest empty state', () => {
  const imported = roles.map((role) => ({ ...role, fastGrowth: -10 }));
  assert.deepEqual(getRecommendedRoles(imported, STARTER_SKILLS, 'fast'), []);
  assert.equal(getJourneyReadiness([]), 0);
});

test('identical imported scenarios do not manufacture role replacements', () => {
  const imported = roles.filter((role) => role.moderateGrowth > 0).map((role) => ({
    ...role,
    fastGrowth: role.moderateGrowth,
    fastResilience: role.moderateResilience,
  }));
  const moderate = getRecommendedRoles(imported, STARTER_SKILLS, 'moderate');
  const fast = getRecommendedRoles(imported, STARTER_SKILLS, 'fast');
  assert.deepEqual(moderate, fast);
  assert.equal(getJourneyReadiness(moderate), Math.round(moderate.reduce((sum, role) => sum + role.match, 0) / moderate.length));
});

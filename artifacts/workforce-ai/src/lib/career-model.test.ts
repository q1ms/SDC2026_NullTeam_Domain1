import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { rankRoles, rolesFromCsv, skillsMatch, STARTER_SKILLS } from './career-model.ts';

const csv = readFileSync(new URL('../../public/data/ai-job-trends.csv', import.meta.url), 'utf8');
const header = 'role,sector,moderate_growth_pct,fast_growth_pct,moderate_resilience,fast_resilience,skills,sdgs\n';

test('sample scenarios contain both emerging and declining roles', () => {
  const roles = rolesFromCsv(csv);
  assert.equal(roles.length, 14);
  assert.equal(roles.filter((role) => role.fastGrowth < 0).length, 2);
  assert.ok(roles.some((role) => role.fastGrowth > role.moderateGrowth));
  assert.ok(roles.filter((role) => role.fastGrowth < 0).every((role) => role.fastGrowth < role.moderateGrowth));
});

test('scenario projections update growth and resilience without changing identities', () => {
  const roles = rolesFromCsv(csv);
  const moderate = rankRoles(roles, STARTER_SKILLS, 'moderate');
  const fast = rankRoles(roles, STARTER_SKILLS, 'fast');
  for (const role of roles) {
    const a = moderate.find((item) => item.id === role.id)!;
    const b = fast.find((item) => item.id === role.id)!;
    assert.equal(a.growth, role.moderateGrowth);
    assert.equal(b.growth, role.fastGrowth);
    assert.equal(a.resilience, role.moderateResilience);
    assert.equal(b.resilience, role.fastResilience);
  }
});

test('match and missing-skill sets partition required skills using the graph predicate', () => {
  for (const role of rankRoles(rolesFromCsv(csv), STARTER_SKILLS, 'fast')) {
    assert.equal(role.matches.length + role.missing.length, role.skills.length);
    for (const required of role.matches) assert.ok(STARTER_SKILLS.some((skill) => skillsMatch(skill, required)));
    for (const required of role.missing) assert.ok(!STARTER_SKILLS.some((skill) => skillsMatch(skill, required)));
  }
});

test('empty skills produce zero fit and no accidental edges', () => {
  assert.ok(rankRoles(rolesFromCsv(csv), [], 'moderate').every((role) => role.match === 0 && role.matches.length === 0));
  assert.equal(skillsMatch('', 'data analysis'), false);
  assert.equal(skillsMatch('Excel', ''), false);
  assert.equal(skillsMatch(' DATA ANALYSIS ', 'data analysis'), true);
  assert.equal(skillsMatch('Excel', 'AI policy'), false);
});

test('imported positive-only projections never manufacture declining roles', () => {
  const roles = rolesFromCsv(header + 'Custom Role,Technology,10,30,70,90,SQL|communication,SDG 8\n');
  const [role] = rankRoles(roles, ['SQL'], 'fast');
  assert.equal(role.growth, 30);
  assert.deepEqual(role.matches, ['SQL']);
  assert.deepEqual(role.missing, ['communication']);
});

test('repeated role titles still have unique graph identities', () => {
  const row = 'Analyst,Technology,10,20,70,80,SQL,SDG 9\n';
  const roles = rolesFromCsv(header + row + row);
  assert.equal(new Set(roles.map((role) => role.id)).size, 2);
});

test('missing columns, blank numeric projections and malformed CSV fail explicitly', () => {
  assert.throws(() => rolesFromCsv('role,skills\nAnalyst,SQL'), /missing required columns/);
  assert.throws(() => rolesFromCsv(header + 'Analyst,Technology,,20,70,80,SQL,SDG 9\n'), /No valid role rows/);
  assert.throws(() => rolesFromCsv(header + '"unterminated'), /CSV parsing issue/);
});

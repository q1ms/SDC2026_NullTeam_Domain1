import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { buildLayout, roleNodeId, skillNodeId, type RoleNodeData } from './graph-layout.ts';
import { rankRoles, rolesFromCsv, skillsMatch, STARTER_SKILLS } from './career-model.ts';

const roles = rolesFromCsv(readFileSync(new URL('../../public/data/ai-job-trends.csv', import.meta.url), 'utf8'));

test('the complete ecosystem includes user, every skill and every role with valid edges', () => {
  const layout = buildLayout(rankRoles(roles, STARTER_SKILLS, 'moderate'), STARTER_SKILLS);
  assert.equal(layout.nodes.length, 1 + STARTER_SKILLS.length + roles.length);
  const ids = new Set(layout.nodes.map((node) => node.id));
  assert.equal(ids.size, layout.nodes.length);
  assert.equal(new Set(layout.edges.map((edge) => edge.id)).size, layout.edges.length);
  for (const edge of layout.edges) {
    assert.ok(ids.has(edge.source));
    assert.ok(ids.has(edge.target));
  }
});

test('graph links exactly reflect shared skills, never invented overlap', () => {
  const ranked = rankRoles(roles, STARTER_SKILLS, 'fast');
  const graph = buildLayout(ranked, STARTER_SKILLS, 'fast');
  for (const role of ranked) {
    const linked = STARTER_SKILLS.filter((skill) => role.skills.some((required) => skillsMatch(skill, required)));
    const edges = graph.edges.filter((edge) => edge.target === roleNodeId(role.id));
    assert.equal(edges.length, linked.length || 1);
    if (!linked.length) {
      assert.equal(edges[0].source, 'user');
      assert.equal(edges[0].data?.kind, 'gap');
    } else {
      assert.deepEqual(new Set(edges.map((edge) => edge.source)), new Set(linked.map(skillNodeId)));
    }
  }
});

test('Fast physically moves nodes, enlarges emerging roles and shrinks declining roles', () => {
  const moderate = buildLayout(rankRoles(roles, STARTER_SKILLS, 'moderate'), STARTER_SKILLS, 'moderate');
  const fast = buildLayout(rankRoles(roles, STARTER_SKILLS, 'fast'), STARTER_SKILLS, 'fast');
  assert.deepEqual(moderate.nodes.map((node) => node.id), fast.nodes.map((node) => node.id));
  for (const role of roles) {
    const a = moderate.nodes.find((node) => node.id === roleNodeId(role.id))!;
    const b = fast.nodes.find((node) => node.id === roleNodeId(role.id))!;
    const from = a.data as RoleNodeData;
    const to = b.data as RoleNodeData;
    assert.notDeepEqual(a.position, b.position);
    if (role.fastGrowth > 0) {
      assert.equal(to.emerging, true);
      assert.ok(to.scale > from.scale);
    } else {
      assert.equal(to.declining, true);
      assert.equal(to.emerging, false);
      assert.ok(to.scale < from.scale);
    }
  }
});

test('ranking changes do not rotate roles or change their graph identities', () => {
  const ranked = rankRoles(roles, STARTER_SKILLS, 'moderate');
  const graph = buildLayout(ranked, STARTER_SKILLS);
  const reversed = buildLayout([...ranked].reverse(), STARTER_SKILLS);
  assert.deepEqual(graph.nodes.map(({ id, position }) => ({ id, position })), reversed.nodes.map(({ id, position }) => ({ id, position })));
});

test('a skill-free graph remains valid and only uses clearly marked gap links', () => {
  const graph = buildLayout(rankRoles(roles, [], 'moderate'), []);
  assert.equal(graph.nodes.length, 1 + roles.length);
  assert.ok(graph.edges.every((edge) => edge.source === 'user' && edge.data?.kind === 'gap'));
  assert.ok(graph.nodes.every((node) => Number.isFinite(node.position.x) && Number.isFinite(node.position.y)));
});

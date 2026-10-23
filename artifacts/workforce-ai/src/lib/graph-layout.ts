import type { Edge, Node } from '@xyflow/react';
import { skillsMatch, normalizeSkill, type RankedRole, type Scenario } from './career-model.ts';

export type RoleNodeData = {
  id: string; title: string; sector: string; growth: number; match: number; sdgs: string[];
  declining: boolean; emerging: boolean; fast: boolean; scale: number;
  selected: boolean; onSelect: (id: string) => void; [k: string]: unknown;
};
export type SkillNodeData = { label: string; dim: boolean; [k: string]: unknown };
export type EdgeData = { kind: 'core' | 'link' | 'gap'; roleId?: string; [k: string]: unknown };

export const ROLE_SIZE = { w: 176, h: 62 };
const SKILL_SIZE = { w: 124, h: 38 };
const USER_SIZE = { w: 112, h: 112 };
const noop = () => {};

const at = (cx: number, cy: number, s: { w: number; h: number }) => ({ x: cx - s.w / 2, y: cy - s.h / 2 });
export const skillNodeId = (skill: string) => `skill:${normalizeSkill(skill)}`;
export const roleNodeId = (id: string) => `role:${id}`;

/** Pure builder: roles keep a fixed angle by stable id; scenario growth moves them radially. */
export function buildLayout(ranked: RankedRole[], skills: string[], scenario: Scenario = 'moderate') {
  const roles = [...ranked].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
  const fast = scenario === 'fast';
  const nodes: Node[] = [{ id: 'user', type: 'user', position: at(0, 0, USER_SIZE), data: {}, draggable: true }];
  const edges: Edge[] = [];
  const skillR = Math.max(230, skills.length * 34);
  skills.forEach((skill, i) => {
    const a = (i / skills.length) * Math.PI * 2 - Math.PI / 2 + 0.2;
    nodes.push({ id: skillNodeId(skill), type: 'skill', position: at(Math.cos(a) * skillR, Math.sin(a) * skillR * .6, SKILL_SIZE), data: { label: skill, dim: false } as SkillNodeData });
    edges.push({ id: `e-user-${skillNodeId(skill)}`, source: 'user', target: skillNodeId(skill), data: { kind: 'core' } as EdgeData });
  });
  const baseX = skillR + 325;
  const baseY = skillR * .6 + 165;
  roles.forEach((role, i) => {
    const a = (i / roles.length) * Math.PI * 2 - Math.PI / 2;
    const g = Math.max(-40, Math.min(45, role.growth));
    const ripple = fast ? g * 1.7 : 0;
    const declining = role.growth < 0;
    const emerging = fast && role.growth > 0;
    const scale = declining ? (fast ? .82 : .96) : emerging ? 1.08 + Math.min(40, role.growth) * .005 : 1;
    nodes.push({
      id: roleNodeId(role.id), type: 'role', position: at(Math.cos(a) * (baseX + ripple * 1.5), Math.sin(a) * (baseY + ripple), ROLE_SIZE),
      data: { id: role.id, title: role.title, sector: role.sector, growth: role.growth, match: role.match, sdgs: role.sdgs, declining, emerging, fast, scale, selected: false, onSelect: noop } as RoleNodeData,
    });
    const linked = new Set<string>();
    for (const required of role.skills) for (const skill of skills) {
      if (skillsMatch(skill, required) && !linked.has(skill)) {
        linked.add(skill);
        edges.push({ id: `e-${skillNodeId(skill)}-${roleNodeId(role.id)}`, source: skillNodeId(skill), target: roleNodeId(role.id), data: { kind: 'link', roleId: role.id } as EdgeData });
      }
    }
    if (!linked.size) edges.push({ id: `e-gap-${roleNodeId(role.id)}`, source: 'user', target: roleNodeId(role.id), data: { kind: 'gap', roleId: role.id } as EdgeData });
  });
  return { nodes, edges };
}

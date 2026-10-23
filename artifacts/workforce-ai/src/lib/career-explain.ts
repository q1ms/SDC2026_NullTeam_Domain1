import { calculateFit, normalizeSkill, rankRoles, skillsMatch, type CareerRole, type RankedRole, type Scenario } from './career-model.ts';

export type SkillConnection = {
  required: string;
  currentMatches: string[];
  kind: 'exact' | 'related' | 'gap';
};

export function getMatchExplanation(role: RankedRole, skills: string[]) {
  const connections: SkillConnection[] = role.skills.map((required) => {
    const currentMatches = skills.filter((current) => skillsMatch(current, required));
    return {
      required,
      currentMatches,
      kind: currentMatches.length
        ? currentMatches.some((current) => normalizeSkill(current) === normalizeSkill(required)) ? 'exact' : 'related'
        : 'gap',
    };
  });
  const covered = connections.filter((item) => item.kind !== 'gap').length;
  return {
    connections,
    covered,
    required: role.skills.length,
    coverage: role.skills.length ? Math.round(covered / role.skills.length * 100) : 0,
    breakdown: calculateFit(role.skills.length, covered, skills.length, role.resilience),
    note: 'Local, rule-based fit estimate—not AI confidence or a hiring probability. Related matches use partial text overlap; fit also includes profile breadth and scenario resilience.',
  };
}

export type LearningResource = {
  title: string;
  provider: string;
  url: string;
  kind: 'Free tutorial' | 'Course search';
};

/** Catalog links support arbitrary imported skills without inventing courses or prices. */
export function getLearningResource(skill: string): LearningResource {
  const normalized = normalizeSkill(skill);
  if (normalized === 'sql') return {
    title: 'Interactive SQL lessons', provider: 'SQLBolt',
    url: 'https://sqlbolt.com/', kind: 'Free tutorial',
  };
  if (normalized === 'gis') return {
    title: 'QGIS training manual', provider: 'QGIS',
    url: 'https://docs.qgis.org/latest/en/docs/training_manual/', kind: 'Free tutorial',
  };
  return {
    title: `Explore ${skill} courses`, provider: 'Coursera',
    url: `https://www.coursera.org/search?query=${encodeURIComponent(skill)}`,
    kind: 'Course search',
  };
}

export function getPracticeHint(index: number) {
  return [
    'Start with a short guided course and one small practice exercise.',
    'Apply it to a real task or a portfolio-sized case study.',
    'Share the result with a peer and capture what changed.',
  ][index % 3];
}

export function getResourcePlanLines(role: RankedRole) {
  return role.missing.flatMap((skill, index) => {
    const resource = getLearningResource(skill);
    return [
      `${index + 1}. Resource: ${resource.title} (${resource.provider}, ${resource.kind}) ${resource.url}`,
      `   Missing skill: ${skill} - ${getPracticeHint(index)}`,
    ];
  });
}

/** Never silently explain a different role when an AI title is ambiguous. */
export function resolveRoleTitle<T extends { title: string }>(roles: T[], title: string): T | undefined {
  const target = normalizeSkill(title);
  if (!target) return undefined;
  const exact = roles.filter((role) => normalizeSkill(role.title) === target);
  if (exact.length) return exact.length === 1 ? exact[0] : undefined;
  const related = roles.filter((role) => normalizeSkill(role.title).includes(target) || target.includes(normalizeSkill(role.title)));
  return related.length === 1 ? related[0] : undefined;
}

export function getScenarioSummary(roles: CareerRole[], skills: string[], scenario: Scenario) {
  const ranked = rankRoles(roles, skills, scenario);
  const top = ranked.slice(0, 5);
  return {
    scenario,
    roles: ranked.length,
    growing: ranked.filter((role) => role.growth > 0).length,
    declining: ranked.filter((role) => role.growth < 0).length,
    stable: ranked.filter((role) => role.growth === 0).length,
    readiness: skills.length && top.length ? Math.round(top.reduce((sum, role) => sum + role.match, 0) / top.length) : 0,
  };
}

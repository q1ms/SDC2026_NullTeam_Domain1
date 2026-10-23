import Papa from 'papaparse';

export type Scenario = 'moderate' | 'fast';
export type CareerRole = {
  id: string;
  title: string;
  sector: string;
  growth: number;
  moderateGrowth: number;
  fastGrowth: number;
  moderateResilience: number;
  fastResilience: number;
  skills: string[];
  sdgs: string[];
};
export type RankedRole = CareerRole & {
  resilience: number;
  match: number;
  matches: string[];
  missing: string[];
};

export const STARTER_SKILLS = ['Project management', 'Data analysis', 'Communication', 'Problem solving', 'Excel', 'Team leadership'];
export const SDG_LABELS: Record<string, string> = {
  'SDG 3': 'Good Health and Well-Being',
  'SDG 4': 'Quality Education',
  'SDG 7': 'Affordable and Clean Energy',
  'SDG 8': 'Decent Work and Economic Growth',
  'SDG 9': 'Industry, Innovation and Infrastructure',
  'SDG 10': 'Reduced Inequalities',
  'SDG 11': 'Sustainable Cities and Communities',
  'SDG 12': 'Responsible Consumption and Production',
  'SDG 13': 'Climate Action',
  'SDG 16': 'Peace, Justice and Strong Institutions',
};

export function normalizeSkill(value: string) {
  return value.trim().toLowerCase();
}

/** One source of truth for the local heuristic and its visible explanation. */
export function calculateFit(required: number, matched: number, current: number, resilience: number) {
  const baseline = current ? 20 : 0;
  const coveragePoints = current && required ? matched / required * 55 : 0;
  const transferabilityPoints = current ? Math.min(.16, current * .012) * 100 : 0;
  const resiliencePoints = current ? resilience * .08 : 0;
  const raw = baseline + coveragePoints + transferabilityPoints + resiliencePoints;
  return { baseline, coveragePoints, transferabilityPoints, resiliencePoints, score: Math.max(0, Math.min(96, Math.round(raw))) };
}

/** Shared predicate keeps graph connections and fit calculations consistent. */
export function skillsMatch(current: string, required: string) {
  const a = normalizeSkill(current);
  const b = normalizeSkill(required);
  return Boolean(a && b) && (a === b || a.includes(b) || b.includes(a));
}

export function rolesFromCsv(text: string): CareerRole[] {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (header) => header.trim().toLowerCase(),
  });
  if (result.errors.length) throw new Error(`CSV parsing issue: ${result.errors[0].message}`);
  const expected = ['role', 'sector', 'moderate_growth_pct', 'fast_growth_pct', 'moderate_resilience', 'fast_resilience', 'skills', 'sdgs'];
  const missing = expected.filter((field) => !(result.meta.fields || []).includes(field));
  if (missing.length) throw new Error(`CSV is missing required columns: ${missing.join(', ')}.`);
  const roles = result.data.flatMap((record, index): CareerRole[] => {
    const title = record.role?.trim();
    const numericFields = ['moderate_growth_pct', 'fast_growth_pct', 'moderate_resilience', 'fast_resilience'];
    if (!title || !record.sector?.trim() || numericFields.some((key) => !record[key]?.trim() || !Number.isFinite(Number(record[key])))) return [];
    const skills = (record.skills || '').split('|').map((item) => item.trim()).filter(Boolean);
    if (!skills.length) return [];
    return [{
      id: `role-${index}`,
      title,
      sector: record.sector.trim(),
      moderateGrowth: Number(record.moderate_growth_pct),
      fastGrowth: Number(record.fast_growth_pct),
      moderateResilience: Number(record.moderate_resilience),
      fastResilience: Number(record.fast_resilience),
      growth: Number(record.moderate_growth_pct),
      skills,
      sdgs: (record.sdgs || '').split('|').map((item) => item.trim()).filter(Boolean),
    }];
  });
  if (!roles.length) throw new Error('No valid role rows found. Check numeric growth and resilience values, plus pipe-delimited skills.');
  return roles;
}

export function rankRoles(roles: CareerRole[], skills: string[], scenario: Scenario, sort: 'match' | 'growth' = 'match'): RankedRole[] {
  return roles.map((role) => {
    const growth = scenario === 'fast' ? role.fastGrowth : role.moderateGrowth;
    const resilience = scenario === 'fast' ? role.fastResilience : role.moderateResilience;
    const matches = role.skills.filter((required) => skills.some((current) => skillsMatch(current, required)));
    const match = calculateFit(role.skills.length, matches.length, skills.length, resilience).score;
    return { ...role, growth, resilience, match, matches, missing: role.skills.filter((skill) => !matches.includes(skill)) };
  }).sort((a, b) => sort === 'match' ? b.match - a.match || b.growth - a.growth : b.growth - a.growth);
}

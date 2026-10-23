import { rankRoles, type CareerRole, type RankedRole, type Scenario } from './career-model.ts';

/**
 * A shortlist, not a labor-market forecast. Moderate preserves skill-fit ranking;
 * Fast removes roles whose actual CSV projection is negative in that scenario.
 */
export function getRecommendedRoles(roles: CareerRole[], skills: string[], scenario: Scenario): RankedRole[] {
  if (!skills.some((skill) => skill.trim())) return [];
  const ranked = rankRoles(roles, skills, scenario);
  return ranked.filter((role) => scenario !== 'fast' || role.growth >= 0).slice(0, 3);
}

/** Derive the active role so scenario and dataset changes cannot leave a stale quest. */
export function getSelectedRecommendation(recommendations: RankedRole[], selectedId: string | null): RankedRole | null {
  return recommendations.find((role) => role.id === selectedId) ?? recommendations[0] ?? null;
}

export function getJourneyReadiness(recommendations: RankedRole[]): number {
  return recommendations.length
    ? Math.round(recommendations.reduce((sum, role) => sum + role.match, 0) / recommendations.length)
    : 0;
}

import type { PathwayAnalysis } from "@workspace/api-client-react";

export type ScenarioPlacement = { rank: number; score: number } | null;

export type RoleComparison = {
  roleTitle: string;
  gradual: ScenarioPlacement;
  faster: ScenarioPlacement;
  /** faster minus gradual; null unless both scores exist */
  scoreDelta: number | null;
};

export const SCENARIO_COPY: Record<string, { label: string; blurb: string }> = {
  moderate: { label: "Gradual AI adoption", blurb: "Gradual: Traditional skills remain strong." },
  fast: { label: "Faster AI adoption", blurb: "Faster: AI oversight roles take priority." },
};

export function scenarioLabel(id: string, fallback: string): string {
  return SCENARIO_COPY[id]?.label ?? fallback;
}

export function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  const suffix = ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th";
  return `${n}${suffix}`;
}

function placement(list: { roleTitle: string; matchScore: number }[] | undefined, role: string): ScenarioPlacement {
  const i = (list ?? []).findIndex((s) => s.roleTitle === role);
  return i < 0 || !list ? null : { rank: i + 1, score: list[i].matchScore };
}

export function buildRoleComparisons(analysis: PathwayAnalysis): RoleComparison[] {
  const gradual = analysis.comparisons.find((c) => c.id === "moderate");
  const faster = analysis.comparisons.find((c) => c.id === "fast");
  const roles = Array.from(new Set(analysis.comparisons.flatMap((c) => (c.scenarios ?? []).map((s) => s.roleTitle))));
  return roles.map((roleTitle) => {
    const g = placement(gradual?.scenarios, roleTitle);
    const f = placement(faster?.scenarios, roleTitle);
    return { roleTitle, gradual: g, faster: f, scoreDelta: g && f ? f.score - g.score : null };
  });
}

export function describeChange(row: RoleComparison): string {
  if (row.scoreDelta === null) {
    if (row.gradual && !row.faster) return "Only a top option with gradual adoption.";
    if (row.faster && !row.gradual) return "New top option with faster adoption.";
    return "Not compared.";
  }
  const d = row.scoreDelta;
  if (d === 0) return "No score change between scenarios.";
  return `Score ${d > 0 ? "up" : "down"} ${Math.abs(d)} ${Math.abs(d) === 1 ? "point" : "points"} with faster adoption.`;
}

export function changeTone(row: RoleComparison): "up" | "down" | "same" | "only" {
  if (row.scoreDelta === null) return "only";
  return row.scoreDelta > 0 ? "up" : row.scoreDelta < 0 ? "down" : "same";
}

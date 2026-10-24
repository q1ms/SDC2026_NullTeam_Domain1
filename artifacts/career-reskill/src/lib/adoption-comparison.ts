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
  moderate: { label: "Gradual AI adoption", blurb: "AI and automation spread steadily over several years." },
  fast: { label: "Faster AI adoption", blurb: "AI and automation are adopted more quickly across workplaces." },
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
    if (row.gradual && !row.faster) return "A top-3 option only with gradual adoption. No score difference to compare.";
    if (row.faster && !row.gradual) return "A top-3 option only with faster adoption. No score difference to compare.";
    return "No comparison available.";
  }
  const d = row.scoreDelta;
  if (d === 0) return "Same fit score in both scenarios";
  const pts = Math.abs(d) === 1 ? "fit-score point" : "fit-score points";
  return `${Math.abs(d)} ${pts} ${d > 0 ? "higher" : "lower"} with faster adoption`;
}

export function changeTone(row: RoleComparison): "up" | "down" | "same" | "only" {
  if (row.scoreDelta === null) return "only";
  return row.scoreDelta > 0 ? "up" : row.scoreDelta < 0 ? "down" : "same";
}

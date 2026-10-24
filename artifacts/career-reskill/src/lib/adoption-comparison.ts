import type { PathwayAnalysis } from "@workspace/api-client-react";

export type ScenarioPlacement = { rank: number; score: number } | null;

export type RoleComparison = {
  roleTitle: string;
  gradual: ScenarioPlacement;
  faster: ScenarioPlacement;
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
    return { roleTitle, gradual: g, faster: f };
  });
}

export function scoreDeltaForScenario(row: RoleComparison, selectedId: string): number | null {
  const active = selectedId === "fast" ? row.faster : row.gradual;
  const other = selectedId === "fast" ? row.gradual : row.faster;
  return active && other ? active.score - other.score : null;
}

export function describeChange(row: RoleComparison, selectedId: string): string {
  const active = selectedId === "fast" ? row.faster : row.gradual;
  const other = selectedId === "fast" ? row.gradual : row.faster;
  const activeLabel = scenarioLabel(selectedId, selectedId === "fast" ? "Faster AI adoption" : "Gradual AI adoption");
  const otherId = selectedId === "fast" ? "moderate" : "fast";
  const otherLabel = scenarioLabel(otherId, otherId === "fast" ? "Faster AI adoption" : "Gradual AI adoption");
  const delta = scoreDeltaForScenario(row, selectedId);

  if (delta === null) {
    if (active && !other) {
      return selectedId === "fast"
        ? "New top option with faster adoption."
        : "Only a top option with gradual adoption.";
    }
    if (!active && other) return `Listed only under ${otherLabel} in the comparison.`;
    return "Not compared.";
  }
  if (delta === 0) return "Same fit score in both adoption scenarios.";
  const points = Math.abs(delta) === 1 ? "point" : "points";
  return `Score ${delta > 0 ? "up" : "down"} by ${Math.abs(delta)} ${points} for ${activeLabel} compared with ${otherLabel}.`;
}

export function changeTone(row: RoleComparison, selectedId: string): "up" | "down" | "same" | "only" {
  const delta = scoreDeltaForScenario(row, selectedId);
  if (delta === null) return "only";
  return delta > 0 ? "up" : delta < 0 ? "down" : "same";
}

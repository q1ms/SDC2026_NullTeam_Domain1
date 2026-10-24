import type { AdoptionComparison, EvidenceSnapshot, GeneratedPathway, PathwayScenario } from "@workspace/api-zod";
import type { CareerProfileInput, JobRole } from "./career-db";
import { learningPlan } from "./career-learning";

export const MATCHING_MODEL = "Career Signal Model 1.0 · deterministic editorial rules; no generative AI/LLM used for rankings or explanations";
export const MODEL_LIMITATIONS = "Scores are heuristic estimates out of 100, not measured probabilities, objective forecasts or hiring outcomes. Five catalog roles are not the whole labor market. Skills are self-reported and only exact names/declared aliases match; experience and industry are context, not verified qualifications. Scenario adjustments and source-to-role mappings are editorial assumptions, not source forecasts. Evidence may be old or outside your geography. Confirm local vacancies, prerequisites and costs; you decide whether to pursue any option.";

const RULES: Record<string, { interests: string[]; moderate: number; fast: number; extra: string; sdg: string }> = {
  "ai-operations-specialist": { interests: ["AI & automation", "Operations & systems"], moderate: 0, fast: 20, extra: "AI output evaluation", sdg: "SDG 9: Industry, Innovation and Infrastructure" },
  "business-intelligence-analyst": { interests: ["Data & analytics", "Operations & systems"], moderate: 7, fast: -3, extra: "AI output evaluation", sdg: "SDG 8: Decent Work and Economic Growth" },
  "customer-success-operations-lead": { interests: ["Product & customer experience", "People & learning", "Operations & systems"], moderate: 8, fast: -8, extra: "AI escalation design", sdg: "SDG 8: Decent Work and Economic Growth" },
  "cyber-risk-coordinator": { interests: ["Cybersecurity", "AI Ethics & Policy"], moderate: 1, fast: 14, extra: "AI risk assessment", sdg: "SDG 16: Peace, Justice and Strong Institutions" },
  "sustainability-data-associate": { interests: ["Climate & sustainability"], moderate: 2, fast: -3, extra: "AI data validation", sdg: "SDG 13: Climate Action" },
};

const ALIASES: Record<string, string[]> = {
  "sql fundamentals": ["sql"], "data visualization": ["data visualisation", "tableau", "power bi"],
  "process mapping": ["process design", "process improvement"], "security fundamentals": ["cybersecurity"],
  "business storytelling": ["data storytelling"], "risk communication": ["risk management"],
};
const normalized = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");
const hasSkill = (skills: string[], required: string) =>
  skills.some((skill) => [normalized(required), ...(ALIASES[normalized(required)] ?? [])].includes(normalized(skill)));

export const DEMO_PROFILE: CareerProfileInput = {
  currentRole: "Operations Coordinator", yearsExperience: 5, industry: "Professional services",
  skills: ["Process mapping", "Business storytelling"], interests: ["Data & analytics", "Operations & systems"],
  weeklyHours: 5,
};

export function buildPathway(
  profileId: string, profile: CareerProfileInput, roles: JobRole[], evidence: EvidenceSnapshot,
  generatedAt = new Date().toISOString(),
): GeneratedPathway {
  if (!Number.isFinite(profile.weeklyHours) || profile.weeklyHours < 1) throw new Error("Weekly learning hours must be positive.");
  const comparisons: AdoptionComparison[] = (["moderate", "fast"] as const).map((id) => {
    const fast = id === "fast";
    const scenarios: PathwayScenario[] = roles.map((role) => {
      const rule = RULES[role.id];
      if (!rule) throw new Error(`Unmapped catalog role: ${role.id}`);
      const matchedSkills = role.skills.filter((skill) => hasSkill(profile.skills, skill));
      const interestMatches = profile.interests.filter((interest) => rule.interests.some((candidate) => normalized(candidate) === normalized(interest)));
      const relevant = evidence.signals.filter((signal) => signal.roleIds.includes(role.id));
      const sourcePoints = relevant.filter((signal) => signal.kind !== "news").reduce((total, signal) => total + signal.weight, 0);
      const newsPoints = Math.min(2, relevant.filter((signal) => signal.kind === "news").reduce((total, signal) => total + signal.weight, 0));
      const skillsPoints = Math.round(40 * matchedSkills.length / role.skills.length);
      const interestPoints = Math.min(16, interestMatches.length * 8);
      const adjustment = rule[id];
      const rawScore = 30 + skillsPoints + interestPoints + sourcePoints + newsPoints + adjustment;
      const skillsGap = role.skills.filter((skill) => !hasSkill(profile.skills, skill));
      if (fast && !hasSkill(profile.skills, rule.extra)) skillsGap.push(rule.extra);
      const reskillingPathway = learningPlan(role.id, fast);
      const hours = reskillingPathway.reduce((total, step) => total + step.estimatedHours, 0);
      const weeks = Math.ceil(hours / profile.weeklyHours);
      return {
        roleTitle: role.title, matchScore: Math.max(1, Math.min(95, rawScore)),
        explainableReason: `From ${profile.currentRole.slice(0, 100)}: ${matchedSkills.length ? matchedSkills.join(", ") : "no exact listed skill matches yet"} covers ${matchedSkills.length}/${role.skills.length} catalog skills; ${interestMatches.length ? `interests in ${interestMatches.join(", ")}` : "no direct interest match"} informs this option.`,
        matchedSkills, skillsGap, reskillingPathway, unSdgTag: rule.sdg as PathwayScenario["unSdgTag"],
        evidenceIds: relevant.map((signal) => signal.id),
        scoreBasis: `30 starting points + ${skillsPoints} skills (40 × matched/required) + ${interestPoints} interests (8 each, max 16) + ${sourcePoints} reviewed evidence + ${newsPoints} news context (max 2) ${adjustment >= 0 ? "+" : "−"} ${Math.abs(adjustment)} ${id}-adoption assumption = ${rawScore}; bounded to 1–95. Editorial index, not probability. ${fast ? `Additional skill assumed: ${rule.extra}.` : "Existing catalog skill requirements assumed."}`,
        paceEstimate: `${hours}–${Math.ceil(hours * 1.5)} practice hours including portfolio work; about ${weeks}–${Math.ceil(hours * 1.5 / profile.weeklyHours)} weeks at ${profile.weeklyHours} h/week. Exploration pace only, not job readiness or a guaranteed completion date.`,
      };
    }).sort((a, b) => b.matchScore - a.matchScore || a.roleTitle.localeCompare(b.roleTitle)).slice(0, 3);
    return {
      id, name: fast ? "Fast adoption" : "Moderate adoption",
      assumptions: fast
        ? "Hypothetical next 2–3 years: routine tasks automate quickly, with increased emphasis on AI operations and risk oversight. Role adjustments: AI operations +20, cyber risk +14, BI −3, customer operations −8, sustainability −3; add AI evaluation/oversight skills. Not a forecast."
        : "Hypothetical next 2–3 years: gradual adoption with human-led process improvement. Role adjustments: BI +7, customer operations +8, sustainability +2, cyber risk +1, AI operations 0. Existing catalog skills remain the baseline. Not a forecast.",
      scenarios,
    };
  });
  return {
    profileId, generatedAt: new Date(generatedAt), scenarios: comparisons[0].scenarios,
    analysis: {
      model: MATCHING_MODEL, limitations: MODEL_LIMITATIONS, evidence, comparisons,
      profileSummary: `${profile.currentRole} · ${profile.yearsExperience} years · ${profile.industry} · ${profile.weeklyHours} learning h/week. Skills: ${profile.skills.join(", ")}. Interests: ${profile.interests.join(", ")}.`,
    },
  };
}

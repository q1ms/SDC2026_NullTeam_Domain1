import type { ReskillingStep } from "@workspace/api-zod";
import { REVIEWED_AT } from "./career-signals";

type Resource = { resourceTitle: string; resourceLink: string; cost: string };
export const LEARNING_RESOURCES: Record<string, Resource> = {
  ethics: { resourceTitle: "Kaggle · Intro to AI Ethics", resourceLink: "https://www.kaggle.com/learn/intro-to-ai-ethics", cost: "Free; account needed for exercises" },
  risk: { resourceTitle: "NIST · AI Risk Management Framework", resourceLink: "https://www.nist.gov/itl/ai-risk-management-framework", cost: "Free public reading and framework" },
  sql: { resourceTitle: "SQLBolt · Interactive SQL lessons", resourceLink: "https://sqlbolt.com/", cost: "Free; no paid certificate required" },
  viz: { resourceTitle: "Kaggle · Data Visualization", resourceLink: "https://www.kaggle.com/learn/data-visualization", cost: "Free; Python familiarity and account for exercises" },
  pandas: { resourceTitle: "Kaggle · Pandas", resourceLink: "https://www.kaggle.com/learn/pandas", cost: "Free; Python familiarity and account for exercises" },
  cyber: { resourceTitle: "Cisco · Introduction to Cybersecurity", resourceLink: "https://www.netacad.com/courses/introduction-to-cybersecurity", cost: "Free; enrollment/account required" },
  climate: { resourceTitle: "GHG Protocol · Corporate Standard", resourceLink: "https://ghgprotocol.org/corporate-standard", cost: "Free standard and guidance; paid training not required" },
};

const RESOURCE_RULES: Array<[RegExp, keyof typeof LEARNING_RESOURCES]> = [
  [/sql|database|query|crm analytics/i, "sql"],
  [/visual|dashboard|storytelling|metric|analytics|data analysis/i, "viz"],
  [/pandas|data quality|data manipulation/i, "pandas"],
  [/cyber|security/i, "cyber"],
  [/risk|policy|vendor|assessment|governance|oversight|evaluation/i, "risk"],
  [/climate|sustainability|emissions|environment|greenhouse|stakeholder research/i, "climate"],
  [/ai|ethics|workflow|process|change|facilitation|systems|customer|escalation/i, "ethics"],
];

function resourceForSkill(skill: string): Resource {
  const key = RESOURCE_RULES.find(([pattern]) => pattern.test(skill))?.[1] ?? "risk";
  return LEARNING_RESOURCES[key];
}

// Each identified gap gets one step that explicitly names the skill it teaches.
// Effort covers guided learning and practice, not just a provider's course runtime.
export function learningPlan(roleTitle: string, skillsGap: string[], fast: boolean): ReskillingStep[] {
  return skillsGap.map((skill) => {
    const resource = resourceForSkill(skill);
    const isAdvanced = /risk|security|policy|assessment|framework|climate|data quality/i.test(skill);
    const estimatedHours = (isAdvanced ? 24 : 18) + (fast && /ai/i.test(skill) ? 4 : 0);
    return {
      step: `Study ${skill} with ${resource.resourceTitle}, then apply it in a small ${roleTitle} practice project.`,
      teachesSkill: skill,
      estimatedHours,
      ...resource,
      checkedAt: REVIEWED_AT,
    };
  });
}

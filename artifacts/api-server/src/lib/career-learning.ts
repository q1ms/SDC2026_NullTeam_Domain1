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

// Effort includes reading, practice, prerequisites and a small portfolio exercise,
// not just the provider's advertised course duration. These are exploration plans,
// not estimates of time until employment or professional qualification.
const PLANS: Record<string, [string, number, string][]> = {
  "ai-operations-specialist": [
    ["Learn responsible AI basics; map one workflow and its human approval points.", 20, "ethics"],
    ["Use the NIST framework to prototype and test an AI-assisted workflow on non-sensitive examples.", 35, "risk"],
    ["Create a portfolio evaluation with failure cases, governance checks and stakeholder feedback.", 30, "risk"],
  ],
  "business-intelligence-analyst": [
    ["Practice SQL joins and aggregations on a public dataset.", 30, "sql"],
    ["Learn Python plotting prerequisites and build a decision-focused visualization.", 35, "viz"],
    ["Audit data quality and write a portfolio case study with business metrics and limitations.", 35, "pandas"],
  ],
  "customer-success-operations-lead": [
    ["Map a customer journey and learn to query handoff and retention metrics.", 25, "sql"],
    ["Build a small reporting example; evaluate CRM automation benefits and human escalation.", 30, "ethics"],
    ["Create a customer-operations pilot proposal and visualize adoption and retention measures.", 30, "viz"],
  ],
  "cyber-risk-coordinator": [
    ["Study security fundamentals and document a threat and control inventory.", 35, "cyber"],
    ["Translate an AI vendor risk assessment into plain business language.", 35, "risk"],
    ["Create a portfolio tabletop exercise and document oversight and escalation controls.", 35, "risk"],
  ],
  "sustainability-data-associate": [
    ["Read the GHG Corporate Standard and map organizational emissions boundaries.", 30, "climate"],
    ["Learn data manipulation prerequisites and validate a small sustainability dataset.", 35, "pandas"],
    ["Compare public disclosures and create a sample inventory with explicit data limitations.", 35, "climate"],
  ],
};

export function learningPlan(roleId: string, fast: boolean): ReskillingStep[] {
  const plan = PLANS[roleId];
  if (!plan) throw new Error(`Missing learning plan for catalog role: ${roleId}`);
  return plan.map(([step, hours, key], index) => ({
    step: fast && index === 2 ? `${step} Add AI output validation and a human fallback.` : step,
    estimatedHours: hours + (fast && index === 2 ? 15 : 0),
    ...LEARNING_RESOURCES[key], checkedAt: REVIEWED_AT,
  }));
}

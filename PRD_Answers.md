# PRD Answers — Future-Ready Workforce AI

**Project:** Future-Ready Workforce AI  
**Team:** NullTeam  
**Domain:** 1 (AIVERSECITY)  
**Hackathon:** SDC Hackathon  
**Repository:** https://github.com/q1ms/SDC2026_NullTeam_Domain1

---

## 1. Problem Statement

**The challenge:** AI is rapidly reshaping the labor market, displacing routine, rules-based roles while creating demand for new AI-adjacent and sustainability-oriented occupations. Workers who cannot anticipate these shifts risk being left behind, and there is no lightweight, scenario-aware tool that helps individuals and HR teams map current skills to resilient, growing roles.

**Key stat:** AI-driven displacement affects a large share of the workforce — roughly **56%** of roles face meaningful disruption/automation exposure, while only about **26%** of workers are on clearly growing, future-ready pathways. This gap (56% vs 26%) is the core problem: a large at-risk population with too little actionable guidance on where to reskill.

**Evidence from the dataset (`job_trends.csv`):** Declining, high-disruption roles include Data Entry Clerk (−8%, High disruption risk) and Routine Reporting Assistant (−4%, High disruption risk). Growing, lower-disruption roles include AI Governance Analyst (+26%), Prompt Engineer (+35%), Human-AI Collaboration Specialist (+28%), and Renewable Energy Analyst (+24%).

**Product response:** A skills-first career simulator that lets a user intake current skills, see role trends and disruption risk, get scenario-aware role matches, receive a reskilling route, view SDG alignment, and toggle uncertainty settings (Moderate vs Fast) to stress-test recommendations.

---

## 2. SDG Alignment

The platform maps recommended roles to the UN Sustainable Development Goals, directly supporting:

- **SDG 4 — Quality Education:** Guides continuous learning and reskilling by surfacing missing skills and pointing users to learning resources for each gap (e.g., SQL, GIS, AI literacy).
- **SDG 8 — Decent Work and Economic Growth:** Helps workers transition out of declining administrative/routine roles into growing, decent-work occupations (Human-AI Collaboration Specialist, Cybersecurity Analyst, Climate Risk Analyst).
- **SDG 9 — Industry, Innovation and Infrastructure:** Prioritizes technology, data, and innovation roles (AI Governance, Prompt Engineering, Responsible AI Research) and maps them to SDG 9 so users build skills aligned with industrial innovation.

**Implementation:** The codebase maintains an `SDG_LABELS` registry (`career-model.ts`) and each role carries `sdgs` (pipe-delimited) rendered in the **Skills & SDGs** view via `SdgPanel`. Roles are explicitly tagged with SDG 4, SDG 8, and SDG 9 where applicable (e.g., Human-AI Collaboration Specialist → SDG 8, SDG 9).

---

## 3. Target Audience

1. **Working adults** — Employees in roles exposed to AI displacement (e.g., data entry, routine reporting) who want to identify resilient roles and a reskilling path based on skills they already have.
2. **Fresh grads** — New entrants exploring which growing roles match their current skill set and which credentials/SDGs those roles support.
3. **HR / workforce planners** — Teams that need to benchmark role trends, disruption risk, and skill gaps across their organization to plan internal mobility and training.

---

## 4. Key Features (6 Must-Haves)

| # | Feature | What it does | Where it lives |
|---|---------|--------------|----------------|
| 1 | **Intake** | User enters current skills (starter skills provided: Project management, Data analysis, Communication, Problem solving, Excel, Team leadership) and selects a scenario. | Dashboard "skills" step + `STARTER_SKILLS` (`career-model.ts`) |
| 2 | **Trend Signal** | Each role shows a growth outlook (+% / −%) and disruption risk so users can see which roles are growing vs declining. | `role.growth`, `disruption_risk` in `job_trends.csv`; RolePicker fit/outlook badges |
| 3 | **Matching** | Rule-based skill-fit scoring ranks roles against the user's skills, showing matched and missing skills. | `rankRoles` / `calculateFit` / `skillsMatch` (`career-model.ts`); `RolePicker` |
| 4 | **Reskilling** | For a selected role, generates a prioritized learning plan from missing skills to resources (free tutorial or course search). | `getResourcePlanLines` / `getLearningResource` (`career-explain.ts`); `QuestMap` |
| 5 | **SDG Mapping** | Shows which UN SDGs a selected role supports, linking career moves to sustainable development. | `SdgPanel` + `SDG_LABELS` (`career-model.ts`) |
| 6 | **Uncertainty** | Lets users toggle between **Moderate** and **Fast** scenarios to stress-test how role recommendations change under different labor-market assumptions. | `Scenario` type ('moderate' | 'fast'); `getRecommendedRoles` (`career-journey.ts`) |

---

## 5. How Uncertainty Is Handled (Moderate vs. Fast Toggle)

The app treats labor-market projections as uncertain scenarios, not facts. A `Scenario` toggle (`'moderate'` | `'fast'`) drives two distinct behaviors in `getRecommendedRoles` (`career-journey.ts`):

- **Moderate:** Preserves the skill-fit ranking. It uses each role's `moderateGrowth` and `moderateResilience` and ranks purely by fit, so users see the best skill matches first regardless of outlook direction.
- **Fast:** A more conservative, risk-aware mode. It removes any role whose actual CSV projection is negative in that scenario (`role.growth >= 0` filter) and returns only the top 3. This protects users from being recommended roles that are projected to decline under a fast-moving AI disruption scenario.

**Additional uncertainty safeguards:**
- Growth and resilience are stored as separate per-scenario columns (`moderate_growth_pct`, `fast_growth_pct`, `moderate_resilience`, `fast_resilience`) so results cannot be mixed across assumptions.
- The dashboard footer explicitly disclaims that built-in values are *illustrative hackathon scenario projections, not verified forecasts*.
- Fit scoring is documented as a *local, rule-based estimate — not AI confidence or a hiring probability* (`career-explain.ts` `note`).
- Users can import their own CSV to test assumptions against alternative datasets.


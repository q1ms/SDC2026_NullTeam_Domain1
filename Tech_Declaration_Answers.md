# Tech Declaration Answers — Future-Ready Workforce AI

**Project:** Future-Ready Workforce AI  
**Team:** NullTeam  
**Domain:** 1 (AIVERSECITY)  
**Hackathon:** SDC Hackathon  
**Repository:** https://github.com/q1ms/SDC2026_NullTeam_Domain1

---

## 1. Team Overview

- **Team name:** NullTeam  
- **Domain:** Domain 1 — AIVERSECITY  
- **Team description:** A group of passionate developers, designers, and problem-solvers building AI solutions to prepare and equip the workforce for the future by analyzing career paths and job trends.  
- **Product:** Future-Ready Workforce AI — a skills-first career simulator for the AI-driven job market.  
- **Submission files:** `PRD_Answers.md`, `Tech_Declaration_Answers.md` (this document).

---

## 2. Architecture

The project is a monorepo built with **pnpm workspaces**:

### Frontend
- **Framework:** React + Vite  
- **Styling:** Tailwind CSS, Radix UI, Framer Motion  
- **Main app:** `artifacts/workforce-ai` (served on http://localhost:5173)  
- **UI mockup sandbox:** `artifacts/mockup-sandbox` (http://localhost:5174)  
- **Key pages/components:** `Dashboard`, `RolePicker`, `QuestMap`, `GapPanel`, `SdgPanel`, `role-picker.tsx`

### Backend
- **Runtime:** Node.js  
- **Server:** Express 5 (`artifacts/api-server`)  
- **Logging:** Pino  
- **API contract:** OpenAPI spec + Orval codegen; validation with Zod (`lib/api-spec`, `lib/api-zod`, `lib/api-client-react`)  
- **Health check endpoint** used by the frontend to detect offline/local-only mode (`useHealthCheck`)

### Data / CSV parsing
- **Source dataset:** `job_trends.csv` (root-level synthetic file)  
- **Parser:** PapaParse (`rolesFromCsv` in `career-model.ts`) with strict schema validation — requires columns `role, sector, moderate_growth_pct, fast_growth_pct, moderate_resilience, fast_resilience, skills, sdgs`; pipe-delimited skills and SDGs.  
- **Storage:** Browser `localStorage` only (`JOURNEY_STORAGE_KEY = 'career-futures.journey'`), Zod-validated snapshots, no server-side database for user profiles.

### Note on Streamlit / Python
- A placeholder `app.py` exists at the repo root but is empty; there is no active Streamlit runtime. The shipped frontend is **React/Vite**, and Python is listed in `.replit` (`python-base-3.13`) only as an available module, not as the serving stack.

---

## 3. External APIs

**None are required for core functionality.**  
- All matching, scoring, trend filtering, reskilling planning, and SDG mapping are implemented as **local, rule-based logic** in TypeScript (`career-model.ts`, `career-journey.ts`, `career-explain.ts`).  
- An OpenRouter API key is referenced in `README.md`/`.replit` as *optional* for AI capabilities, but the application runs fully offline without it (the health check gracefully degrades to "Offline, local matching active").  
- No third-party APIs are called for job data, user profiles, or payments.

---

## 4. AI Tools Used

- **Replit:** Cloud-native development and deployment workflow. Used for collaborative cloud IDE workspaces, automated `.replit` configuration (nodejs-24), build steps, parallel workflow execution, and Replit hosting for the hackathon demo.  
- **Cline:** AI coding assistant used during development to explore, read, and write project files and documentation (including generating this submission).

---

## 5. Datasets

**Primary dataset:** `job_trends.csv` — **synthetic / illustrative hackathon data.**  
- Columns: `role, industry, skills_required, trend_growth, disruption_risk, sdgs`  
- Contains 10 roles spanning Energy, Technology, Operations, Professional Services, Finance, and Administration.  
- Mix of growing roles (AI Governance Analyst +26%, Prompt Engineer +35%) and declining/high-disruption roles (Data Entry Clerk −8% High, Routine Reporting Assistant −4% High).  
- Each role tagged with SDGs (e.g., SDG 4, SDG 8, SDG 9, SDG 13, SDG 16).

**Code-ingested dataset:** `artifacts/workforce-ai/public/data/ai-job-trends.csv` — the file actually parsed by the React app, with schema `role, sector, moderate_growth_pct, fast_growth_pct, moderate_resilience, fast_resilience, skills, sdgs`.

**Data disclaimer (from the app footer):** Built-in values are illustrative hackathon scenario projections, not verified forecasts. Users may import their own CSV to replace the built-in dataset.

---

## 6. Security

- **No real personal data:** The app stores only a user-entered skills list and scenario preference in browser `localStorage`; it never collects names, emails, resumes, credentials, or any PII.  
- **No cross-device sync:** Saved profiles are local to the browser and explicitly not synced across devices or accounts.  
- **Rule-based logic only:** Fit scoring and matching are deterministic heuristics (`calculateFit`, `skillsMatch`) — not AI confidence scores or hiring probabilities. The code states this plainly in `career-explain.ts`.  
- **Input validation:** All CSV imports and stored snapshots are validated with Zod strict schemas (size limits, finite numbers, unique role IDs, trimmed text), and malformed data triggers safe fallbacks (fresh session) rather than crashes.  
- **No secrets in code:** API keys are expected via environment variables only (e.g., optional `OPENROUTER_API_KEY`); none are committed.

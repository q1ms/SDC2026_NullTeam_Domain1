# Career Reskilling Dashboard

A career planning dashboard that stores experience profiles and job-role learning pathways in SQLite, with a curated skills map for all 17 UN Sustainable Development Goals.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/career-reskill run dev` — run the career dashboard
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Optional env: `CAREER_DB_PATH` — override the local SQLite database file path

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/api-server/src/lib/career-db.ts` — SQLite schema, seed initialization, and database queries
- `artifacts/api-server/src/lib/career-seed.ts` — starter job-role and 17-goal skill catalog
- `artifacts/api-server/src/routes/career.ts` — profile, role-catalog, and SDG mapping endpoints
- `lib/api-spec/openapi.yaml` — source contract for generated API types and hooks
- `artifacts/career-reskill/src` — dashboard, intake form, and role pathway UI

The SQLite file is created at `artifacts/api-server/data/career-reskilling.sqlite` by default and is excluded from Git and deployment uploads. Published-app filesystems reset on restart, so this local SQLite file is not durable production storage.

## Architecture decisions

- The dashboard uses a browser-stored UUID to identify a profile; it does not provide authentication or cross-device profile access.
- Job-role salary bands and trend figures are illustrative examples. The 17 SDG skill links are curated for exploration, not official UN guidance.

## Product

- Collects a user's current role, experience, industry, strengths, interests, and weekly learning time.
- Suggests adjacent roles and learning steps based on that profile.
- Shows sample AI-related skill trends and expandable skill mappings for each of the 17 UN SDGs.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details

# Agent instructions

Concise context for AI coding agents and developers who need orientation before making changes.

## Read first (order)

1. **[README.md](README.md)** — current repo state, commands, env vars, what exists vs what does not.
2. **[docs/greenfield-agent-handoff.md](docs/greenfield-agent-handoff.md)** — authoritative product/spec: phases, GraphQL contract, ingest, RBAC, Railway constraints.
3. This file — pointers and rules only; duplicate as little spec prose as possible here.

## Current baseline (update when you ship work)

- **Active phase:** Phase 1 (backend foundation), near completion of exit criteria.
- **Implemented:** pnpm monorepo; `packages/db` (Kysely, migration `0001` for `users` / `sites` / `user_sites`, migrate + seed scripts); `apps/api` Nest app with `DatabaseModule`, `HealthModule`, GraphQL (`/graphql`), JWT HTTP-only cookie auth (`login`, `logout`, `getMe`), RBAC decorators/guards, admin-only `adminUsers`; `GET /health`.
- **Not implemented yet:** `POST /ingest`, measurements/devices tables, TanStack web app, alerts/scheduler/email, full admin CRUD per handoff, firmware/snapshots.
- **Env contract:** use **`DATABASE_PUBLIC_URL`** for Postgres (see `README.md`). Do not reintroduce `DATABASE_PUBLIC_URL` as the primary app variable without an explicit project decision.

## Key paths

| Path                               | Role                                                                  |
| ---------------------------------- | --------------------------------------------------------------------- |
| `apps/api/src/`                    | Nest modules, resolvers, guards, `main.ts`                            |
| `packages/db/src/migrations/`      | SQL migrations via Kysely Migrator                                    |
| `packages/db/src/scripts/`         | `migrate.ts`, `seed.ts`                                               |
| `README.md`                        | **Update** when behavior, commands, env vars, or phase status changes |
| `docs/greenfield-agent-handoff.md` | Spec; edit only when product/contracts change                         |

## Commands (root)

```bash
pnpm install
pnpm typecheck
pnpm build:api
pnpm dev:api
pnpm migrate:deploy
pnpm seed
pnpm db:setup
```

`pnpm dev:api` builds `@aquaponics/db` first, then runs `nest start --watch` (not `tsx`) so GraphQL decorator metadata is emitted correctly.

Run **`pnpm migrate:deploy` before `pnpm seed`** on an empty database (or use **`pnpm db:setup`**). Migrate/seed read `DATABASE_PUBLIC_URL` from **`packages/db/.env`** when run via pnpm filter (see `README.md`).

Use **Node 20** when running tooling.

## Implementation constraints (from spec)

- One Node API process MVP assumptions; no Redis/queues for MVP unless spec changes.
- Dashboard auth: signed JWT in **HTTP-only cookie** only; load `role` from DB on GraphQL requests; bcrypt cost 12.
- Do not expose device ingestion on GraphQL (`POST /ingest` only when Phase 2 lands).
- Pin exact dependency versions in `package.json` files (no `^` / `~`).
- After meaningful progress, update **`README.md`** (current status + any new endpoints/commands/env vars) and this **Current baseline** section.

## Git / commits

Only create commits when the user asks. Do not commit `.env` or secrets.

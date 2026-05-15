# Agent instructions

Concise context for AI coding agents and developers who need orientation before making changes.

## Read first (order)

1. **[docs/development.md](docs/development.md)** — commands, env vars, web conventions, dev server notes, Railway deployment.
2. **[docs/greenfield-agent-handoff.md](docs/greenfield-agent-handoff.md)** — authoritative product/spec: phases, GraphQL contract, ingest, RBAC, Railway constraints.
3. This file — pointers and rules only; duplicate as little spec prose as possible here.

## Current baseline (update when you ship work)

- **Active phase:** Phase 4 (alerts: DB + anomaly on ingest + scheduler + Resend + dashboard views) — in progress; **`0003_phase4_alerts`** adds `site_sensor_catalog`, `sensor_thresholds`, `alerts` (+ partial unique active dedupe).
- **Implemented:** Phase 1 complete (monorepo, `packages/db` migrations + seed, Nest `DatabaseModule`, `HealthModule`, GraphQL `/graphql`, cookie JWT auth, `getMe`, RBAC + `adminUsers`, sanitized GraphQL errors, Railway build scripts). Phase 2: `sensor_catalog` / `devices` / `measurements`, seed device + API key, **`POST /ingest`**. Phase 3 M1: GraphQL **`getSites`**, **`getSite`**, **`getMeasurements`**, **`getSensorMeasurements`** + **`apps/web`** (TanStack Start, login, Codegen from `apps/api/schema.graphql`). Phase 3 M2: shadcn/ui (Tailwind 3 + `tailwindcss-animate` + `lucide-react` + `recharts`), pathless `_authed` layout with `DashboardShell` (sidebar + topbar + user menu / logout), `/sites` list + `/sites/$siteId` charts + `TimeRange` tabs, **`i18next`** (`en` / `es`, header language + appearance menus), **`ThemeProvider`** (light / dark / system, class-based `dark:` + `localStorage`, inline bootstrap in root `head`), mobile nav (slide-in drawer + backdrop fade, closes on route change). Hooks: `useSites`, `useSite`, `useSensorMeasurements`, `useLogoutMutate`, **`useAlerts`**, **`useResolveAlertMutate`**. Phase 4: **`IngestAlertService`** — range bands + **MVP heuristics** (`ingest-heuristics.util.ts`); **`syncDeviceOfflineStateForSite`** + **`syncAllDeviceOfflineStates`** (~60s **`@nestjs/schedule`**); GraphQL **`getAlerts`** / **`resolveAlert`** (resolve only **active** rows); **`AlertsModule`** + **`ResendMailerService`** + critical **`COOLDOWN_MINUTES`** re-notify; web **`/alerts`** + **`SiteAlertsSection`**; **`captureImageNow`** from active alerts; **`site-sensor-filter.util.ts`** + **`alert-sensor-key.util.ts`** omit **disabled** `site_sensor_catalog` sensors from **getAlerts**, **getMeasurements**, **getSensorMeasurements**, **`SiteStatus`** derivation, **`captureImageNow`**, and critical-email selection; **`SiteStatus`**: **OK** / **UNKNOWN** / **WARNING** / **CRITICAL** (from active alerts + telemetry freshness).
- **Not implemented yet:** `POST /ingest/snapshot`, full admin CRUD (Phase 5), firmware/snapshots/object storage (Phase 6).
- **Env contract:** use **`DATABASE_PUBLIC_URL`** for Postgres (see `README.md`). Do not reintroduce `DATABASE_URL` as the primary app variable without an explicit project decision.

## Key paths

| Path                               | Role                                                                  |
| ---------------------------------- | --------------------------------------------------------------------- |
| `apps/api/src/`                    | Nest modules, resolvers, guards, `main.ts`                            |
| `apps/api/src/ingest/`             | `POST /ingest`; `ingest-alert.service.ts`, `range-anomaly.util.ts`, **`ingest-heuristics.util.ts`** (range + MVP heuristics, per-site **`device_offline`** sync, `captureImageNow`) |
| `apps/api/src/alerts/`             | `getAlerts` / `resolveAlert`, `ResendMailerService`, `device-offline.util.ts` |
| `apps/api/src/scheduler/`          | `SchedulerService` — ~60s offline sweep + critical alert email loop |
| `apps/web/src/hooks/`              | **Hooks only.** All API-backed `useQuery` / `useMutation` live here; every export must be a React hook. Naming: `use<Resource>` for queries, `use<Resource>Mutate` for mutations (e.g. `useMe`, `useLoginMutate`). Always destructure at the call site; mutation side-effects (`invalidateQueries`, etc.) go in `onSuccess`/`onError` — not in components. Routes/components must not import GraphQL or `useQuery` directly. |
| `apps/web/src/api/`                | Non-hook data access for route `beforeLoad`. **`api/session.ts`** exports `loadRootContext` (root route fetches session once → injects `RouterContext`), `requireAuth(context)` (redirect to `/login`), `requireGuest(context)` (redirect to `/sites`), and `sessionUserQueryKey`. Route files call `requireAuth` / `requireGuest` — never `fetchSessionUser` directly. |
| `apps/web/src/utils/`              | Generic non-hook utilities (e.g. `~/utils/graphql.ts` with `graphqlRequest`). |
| `apps/web/src/query-client.ts`     | TanStack Query `queryClient` singleton (wired into `QueryClientProvider` in `app.tsx`). |
| `apps/web/src/gql/`                | GraphQL operations (`*.graphql`); codegen output in `~/gql/generated/`. |
| `apps/web/src/i18n/`               | `i18next` init (`i18n.ts`), `supported-languages.ts` (codes for UI + `supportedLngs`); `I18nextProvider` in `app.tsx`. |
| `apps/web/src/theme/`              | `ThemeProvider`, `dashboard-theme-storage.ts`, inline head bootstrap for FOUC. |
| `apps/web/src/locales/`            | Bundled locale JSON (`en.json`, `es.json`, …); same nested keys in every file. |
| `apps/web/src/components/ui/`      | shadcn/ui primitives (`button`, `card`, `badge`, `tabs`, `chart`, etc.). Add new ones here, never edit Radix usage directly in pages. |
| `apps/web/src/components/layout/`  | `DashboardShell`, `AppSidebar`, `AppHeader`, `PageHeader` — the chrome shared by every `_authed` route. |
| `apps/web/src/components/sites/`   | `SiteCard`, `SiteStatusBadge` (OK / unknown / **warning** / **critical**), `SensorChart`, `TimeRangeTabs`, `SiteAlertsSection` |
| `apps/api/src/sites/`               | `alert-sensor-key.util.ts`, `site-sensor-filter.util.ts` (omit **disabled** `site_sensor_catalog` rows from **getAlerts**, **getMeasurements**, **getSensorMeasurements**, site **status**, `captureImageNow`, critical email candidates) |
| `apps/web/src/routes/_authed.tsx`  | Pathless layout route; calls `requireAuth` + renders `DashboardShell`. All authenticated pages live under `_authed.*.tsx`. |
| `apps/web/`                        | TanStack Start dashboard; `pnpm dev:web` / `pnpm build:web` / `pnpm start:web` |
| `packages/db/src/migrations/`      | SQL migrations via Kysely Migrator                                    |
| `packages/db/src/scripts/`         | `migrate.ts`, `seed.ts`                                               |
| `README.md`                        | **Update** when behavior, commands, env vars, or phase status changes |
| `docs/greenfield-agent-handoff.md` | Spec; edit only when product/contracts change                         |

## Commands (root)

```bash
pnpm install
pnpm typecheck
pnpm build:api
pnpm build:web
pnpm dev:api
pnpm dev:web
pnpm migrate:deploy
pnpm seed
pnpm db:setup
```

`pnpm dev:web` requires **Node 22.12+** (same as root `engines`). Use **`fnm exec`** / **`nvm use`** if your default shell Node is older.

`pnpm dev:api` builds `@aquaponics/db` first, then runs `nest start --watch` (not `tsx`) so GraphQL decorator metadata is emitted correctly.

Run **`pnpm migrate:deploy` before `pnpm seed`** on an empty database (or use **`pnpm db:setup`**). Migrate/seed read `DATABASE_PUBLIC_URL` from **`packages/db/.env`** when run via pnpm filter (see `README.md`).

## Implementation constraints (from spec)

- One Node API process MVP assumptions; no Redis/queues for MVP unless spec changes.
- Dashboard auth: signed JWT in **HTTP-only cookie** only; load `role` from DB on GraphQL requests; bcrypt cost 12.
- Device ingestion is **REST only** (`POST /ingest`); do not expose it on GraphQL.
- Pin exact dependency versions in `package.json` files (no `^` / `~`). For **add → check lock → pin**, see **README → “Adding dependencies and pinning versions”** (`pnpm add --filter … --save-exact`, or read `pnpm-lock.yaml` / `pnpm list` then set the exact string in `package.json`).
- **Web (`apps/web`):** **`src/hooks/`** contains hooks only — every export must be a React hook (`useQuery` / `useMutation` wrappers). Hook naming: **`use<Resource>`** for queries, **`use<Resource>Mutate`** for mutations (e.g. `useMe`, `useLoginMutate`). Always **destructure** at the call site (e.g. `const { mutateAsync: mutateLogin, isPending: isLoginPending } = useLoginMutate()`). Mutation **side-effects** (`invalidateQueries`, refetches) belong in `onSuccess`/`onError`/`onSettled` inside the hook — not in components. Non-hook code is split: route auth guards live in **`src/api/`** — the root route calls `loadRootContext` once to fetch the session and inject `RouterContext`; child routes call `requireAuth(context)` or `requireGuest(context)` from `~/api/session.ts`, never `fetchSessionUser` directly. Generic helpers like `graphqlRequest` live in **`src/utils/`**; the TanStack `queryClient` singleton is **`~/query-client.ts`**; GraphQL operations and codegen output live in **`src/gql/`** (codegen → `~/gql/generated/`). **Routes and components** must not import **`~/gql/generated/...`**, **`graphql`**, **`useQuery`**, or **`useMutation`** directly — fetch state via **`~/hooks/...`** and call **`~/api/...`** guards from `beforeLoad`. See **[docs/development.md](docs/development.md) → "Web dashboard conventions"**.
- After meaningful progress, update **`README.md`** (current status + any new endpoints/commands/env vars) and this **Current baseline** section.

## Git / commits

Only create commits when the user asks. Do not commit `.env` or secrets.

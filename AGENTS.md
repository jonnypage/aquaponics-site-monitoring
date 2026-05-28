# Agent instructions

Concise context for AI coding agents and developers who need orientation before making changes.

## Read first (order)

1. **[docs/development.md](docs/development.md)** — commands, env vars, web conventions (routing, UI patterns), dev server notes, Railway deployment.
2. **[docs/greenfield-agent-handoff.md](docs/greenfield-agent-handoff.md)** — authoritative product/spec: phases, GraphQL contract, ingest, RBAC, Railway constraints.
3. **[docs/phase6-agent-prompt.md](docs/phase6-agent-prompt.md)** — Phase 6 status and key paths.
4. **[docs/phase6-verification.md](docs/phase6-verification.md)** — Phase 6 smoke test checklist (run before calling Phase 6 done in prod).
5. **[docs/phase7-agent-prompt.md](docs/phase7-agent-prompt.md)** — Phase 7 **planned** (notifications & alert policy; deferred).
6. This file — pointers and rules only; duplicate as little spec prose as possible here.

## Current baseline (update when you ship work)

- **Active phase:** Phases **1–6** MVP **code complete** — operator sign-off: **[docs/phase6-verification.md](docs/phase6-verification.md)** + **[docs/phase6-railway-production.md](docs/phase6-railway-production.md)**. **Phase 7** (notifications) **planned** — **[docs/phase7-agent-prompt.md](docs/phase7-agent-prompt.md)**. Post-MVP: ESP32 CYD flash ([docs/esp32-cyd-roadmap.md](docs/esp32-cyd-roadmap.md)), real camera driver.
- **Implemented:** (Phases 1–5 as before.) **Sensor catalog:** migration **`0009_sensor_type_model`** — `sensor_type` + `model` on `sensor_catalog`; default keys `ds18b20`, `bncPhModule`, `floatSwitch`, `yfs201`; heuristics/charts by family, ingest by slug **`key`**. **Phase 6:** snapshots + S3 ingest; **`getSite.latestSnapshot`** / **`adminDevice.recentSnapshots`**; site detail map/snapshot row; **`AdminDeviceRecentSnapshots`** on device edit; admin **reset site measurements** / **clear site snapshots**; install wizard + **`scripts/ensure-or-build-firmware.mjs`** (real `firmware.bin` on CI/Railway); ESP8266 firmware config **`v: 3`** (`sensorTypes` map); wiring v2 + **`0008`**.
- **Not implemented yet:** Phase 7 notifications; ESP32 CYD installer (roadmap only); real camera hardware driver.
- **Staging sites (ops, no code):** use an admin-only **“Device staging”** site — do not assign to non-admins; assign devices there for calibration ingest; reassign to production when ready.
- **Env contract:** use **`DATABASE_PUBLIC_URL`** for Postgres (see `README.md`). Do not reintroduce `DATABASE_URL` as the primary app variable without an explicit project decision.

## Key paths

| Path                               | Role                                                                  |
| ---------------------------------- | --------------------------------------------------------------------- |
| `apps/api/src/`                    | Nest modules, resolvers, guards, `main.ts`                            |
| `apps/api/src/ingest/`             | `POST /ingest`, **`POST /ingest/snapshot`**; `ingest-alert.service.ts`, **`ingest-snapshot.service.ts`**, range/heuristics, `captureImageNow` |
| `apps/api/src/storage/`            | S3-compatible upload + presigned reads (`OBJECT_STORAGE_*`; Railway bucket) |
| `apps/api/src/snapshots/`          | Snapshot metadata → presigned URLs for GraphQL |
| `firmware/aquaponics-node/`        | PlatformIO ESP8266 firmware (outside pnpm) |
| `apps/web/public/firmware/esp8266/`| Gitignored `firmware.bin` + README; `pnpm firmware:build` / `firmware:ensure` |
| `scripts/build-firmware.mjs` | `pnpm firmware:build` (pio run + copy) |
| `scripts/generate-firmware-placeholder.mjs` | Placeholder `firmware.bin` |
| `scripts/ensure-or-build-firmware.mjs` | `predev:web` / `prebuild:web` — placeholder locally, `pio` build on CI/Railway |
| `scripts/ensure-firmware-binary.mjs` | Placeholder only (`firmware:ensure`) |
| `scripts/copy-firmware-build.mjs` | `pnpm firmware:copy` (copy only) |
| `packages/db/src/sensor-wiring.ts` | `wiring_template` / `pin_map` types + validation |
| `apps/web/src/utils/sensor-wiring.ts` | Web wiring types + GraphQL normalize |
| `apps/web/src/utils/firmware-sensor-pins.ts` | Install rows, `buildFirmwarePins` v2, `buildDevicePinMap` |
| `apps/web/src/components/admin/sensor-wiring-editor.tsx` | Catalog wire template editor |
| `apps/web/src/components/admin/install-sensor-pins-fieldset.tsx` | Install color → GPIO UI |
| `apps/api/src/alerts/`             | `getAlerts` / `resolveAlert`, `ResendMailerService`, `device-offline.util.ts` |
| `apps/api/src/admin/`              | **`AdminService`**, **`AdminResolver`** — admin-only GraphQL queries/mutations |
| `apps/web/src/hooks/`              | **Hooks only.** All API-backed `useQuery` / `useMutation` live here; every export must be a React hook. Naming: `use<Resource>` for queries, `use<Resource>Mutate` for mutations (e.g. `useMe`, `useLoginMutate`). Always destructure at the call site; mutation side-effects (`invalidateQueries`, etc.) go in `onSuccess`/`onError` — not in components. Routes/components must not import GraphQL or `useQuery` directly. Admin GraphQL: **`~/hooks/useAdmin.ts`**. |
| `apps/web/src/api/`                | Non-hook data access for route `beforeLoad`. **`api/session.ts`** exports `loadRootContext` (root route fetches session once → injects `RouterContext`), `requireAuth(context)` (redirect to `/login`), `requireGuest(context)` (redirect to `/sites`), **`requireAdmin(context)`** (redirect to `/sites` if not `ADMIN`), and `sessionUserQueryKey`. Route files call `requireAuth` / `requireGuest` / `requireAdmin` — never `fetchSessionUser` directly. |
| `apps/web/src/utils/`              | Generic non-hook utilities (e.g. `~/utils/graphql.ts` with `graphqlRequest`). |
| `apps/web/src/query-client.ts`     | TanStack Query `queryClient` singleton (wired into `QueryClientProvider` in `app.tsx`). |
| `apps/web/src/gql/`                | GraphQL operations (`*.graphql`); codegen output in `~/gql/generated/`. |
| `apps/web/src/i18n/`               | `i18next` init (`i18n.ts`), `supported-languages.ts` (codes for UI + `supportedLngs`); `I18nextProvider` in `app.tsx`. |
| `apps/web/src/theme/`              | `ThemeProvider`, `dashboard-theme-storage.ts`, inline head bootstrap for FOUC. |
| `apps/web/src/locales/`            | Bundled locale JSON (`en.json`, `es.json`, …); same nested keys in every file. |
| `apps/web/src/components/ui/`      | shadcn/ui primitives (`button`, `card`, `badge`, `tabs`, `chart`, etc.). Add new ones here, never edit Radix usage directly in pages. |
| `apps/web/src/components/layout/`  | `DashboardShell`, `AppSidebar`, `AppHeader`, `PageHeader`, **`PageBackLink`** (outline + chevron back links) |
| `apps/web/src/components/ui/loading-indicator.tsx` | **`LoadingIndicator`**, **`ButtonPendingLabel`** — spinners; use with skeleton-only pages, not both |
| `apps/web/src/components/sites/`   | `SiteCard`, `SiteStatusBadge` (OK / unknown / **warning** / **critical**), `SensorChart`, `TimeRangeTabs`, `SiteAlertsSection` |
| `apps/web/src/components/admin/`   | Admin-only UI such as **`SiteLocationMapPicker`** (optional Maps env). |
| `apps/web/src/features/`           | Route-mounted **`*PageContent`** modules (`sites/`, `alerts/`, `admin/`, `auth/`). Page UI and hooks live here — **not** in `src/routes/` (avoids `routeTree.gen.ts` regen on every edit). Param routes use **`getRouteApi('/exact/route/id')`**. |
| `apps/api/src/sites/`               | `alert-sensor-key.util.ts`, `site-sensor-filter.util.ts` (omit **disabled** `site_sensor_catalog` rows from **getAlerts**, **getMeasurements**, **getSensorMeasurements**, site **status**, `captureImageNow`, critical email candidates) |
| `apps/web/src/routes/`             | **Thin** directory-based routes: root `__root.tsx`, `login.tsx`, `_authed.tsx`; segments under `_authed/` (`sites/`, `admin/devices/$deviceId/edit.tsx`, …). |
| `apps/web/src/routes/_authed/admin.tsx` | **`requireAdmin`** in `beforeLoad`; child routes under `routes/_authed/admin/`. |
| `apps/web/src/routes/_authed.tsx`  | Pathless layout; `requireAuth` + `DashboardShell`. |
| `apps/web/`                        | TanStack Start dashboard; `pnpm dev:web` / `pnpm build:web` / `pnpm start:web` |
| `packages/db/src/migrations/`      | SQL migrations via Kysely Migrator                                    |
| `packages/db/src/sensor-types.ts`    | `SENSOR_TYPES`, default seed catalog rows                             |
| `packages/db/src/scripts/`         | `migrate.ts`, `seed.ts`, `seed-users.ts`, `seed-demo.ts`              |
| `README.md`                        | **Update** when behavior, commands, env vars, or phase status changes |
| `docs/greenfield-agent-handoff.md` | Spec; edit only when product/contracts change                         |
| `docs/phase6-agent-prompt.md`      | Phase 6 agent bootstrap (snapshots, storage, esp-web-tools)           |
| `docs/phase7-agent-prompt.md`      | Phase 7 **planned** — notifications & alert policy (deferred)        |

## Commands (root)

```bash
pnpm install
pnpm typecheck
pnpm build:api
pnpm build:web
pnpm dev:api
pnpm dev:web
pnpm firmware:placeholder   # stub installer binary (gitignored path)
pnpm firmware:build       # pio run + copy to web public
pnpm firmware:copy        # copy only (after manual pio run)
pnpm migrate:deploy
pnpm seed
pnpm seed:users
pnpm seed:demo
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
- **Web (`apps/web`):** **`src/hooks/`** contains hooks only — every export must be a React hook (`useQuery` / `useMutation` wrappers). Hook naming: **`use<Resource>`** for queries, **`use<Resource>Mutate`** for mutations (e.g. `useMe`, `useLoginMutate`). Always **destructure** at the call site (e.g. `const { mutateAsync: mutateLogin, isPending: isLoginPending } = useLoginMutate()`). Mutation **side-effects** (`invalidateQueries`, refetches) belong in `onSuccess`/`onError`/`onSettled` inside the hook — not in components. Non-hook code is split: route auth guards live in **`src/api/`** — the root route calls `loadRootContext` once to fetch the session and inject `RouterContext`; child routes call `requireAuth(context)` or `requireGuest(context)` from `~/api/session.ts`, never `fetchSessionUser` directly. **`src/routes/`** is wiring-only (`createFileRoute`, `beforeLoad`, `component` from **`~/features/...`**); page UI lives in **`src/features/`** (`*PageContent`). Param/context in features: **`getRouteApi`** with the exact route id — see **[docs/development.md](docs/development.md) → "Route files vs feature page content"**. Generic helpers like `graphqlRequest` live in **`src/utils/`**; the TanStack `queryClient` singleton is **`~/query-client.ts`**; GraphQL operations and codegen output live in **`src/gql/`** (codegen → `~/gql/generated/`). **Routes, features, and components** must not import **`~/gql/generated/...`**, **`graphql`**, **`useQuery`**, or **`useMutation`** directly — fetch state via **`~/hooks/...`** and call **`~/api/...`** guards from `beforeLoad`. See **[docs/development.md](docs/development.md) → "Web dashboard conventions"**.
- After meaningful progress, update **`README.md`** (current status + any new endpoints/commands/env vars) and this **Current baseline** section.

## Git / commits

Only create commits when the user asks. Do not commit `.env` or secrets.

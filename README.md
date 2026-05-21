# Aquaponics Site Monitoring

A small monitoring platform for aquaponics sites, built to collect field sensor data, give operators a clear dashboard, and surface problems before they turn into emergencies.

ESP-based devices send telemetry to a NestJS API, PostgreSQL stores readings and site data, and a TanStack Start dashboard gives users a place to log in and inspect site health.

## What Is Working

- **Device telemetry ingest:** devices can `POST /ingest` with an API key and submit readings for temperature, pH, water level, and flow. After migration `0003`, ingest evaluates **out-of-range** readings, **MVP heuristics** (spikes, flatlines, pH drift, level/flow step issues — see `ingest-heuristics.util.ts`), upserts matching alerts for **enabled** site sensors, **recomputes `device_offline` per site** from all devices’ `last_seen_at`, and sets **`captureImageNow`** when the site has any **active** alert.
- **Alerts API & UI:** GraphQL **`getAlerts`** (optional `siteId`, `type`, `status`; site RBAC) and **`resolveAlert`**; dashboard **`/alerts`** (active/all tabs) plus **active alerts** on each **`/sites/$siteId`** page with a link to the global list. In-process **`@nestjs/schedule`** (~60s) keeps **`device_offline`** in sync and emails **critical** alerts via **Resend** when `RESEND_API_KEY` and `ALERT_FROM_EMAIL` are set (`COOLDOWN_MINUTES`, default 45).
- **Database foundation:** migrations, seed data, users, sites, devices, sensor catalog, measurements, and **Phase 4 alert tables** (`site_sensor_catalog`, `sensor_thresholds`, `alerts` — migrate to `0003` to enable) are managed through `packages/db`. Migration **`0004`** adds optional **`sites.latitude`** / **`sites.longitude`** for admin site forms.
- **Authenticated API:** the dashboard API uses GraphQL, HTTP-only JWT cookies, bcrypt password hashing, and role-aware access checks. **Profile updates** use **`updateMe`** (current password required; clears the session cookie so the client signs in again). **Admin-only** GraphQL (`sensorCatalog`, `adminUsers` with assignments, `adminSites`, `adminDevices`, catalog and admin CRUD mutations) is implemented in [`apps/api/src/admin/`](apps/api/src/admin/).
- **Web dashboard shell:** TanStack Start is wired up with login, session loading, protected routes, site/measurement GraphQL reads, **site status** (OK / unknown / warning / critical from alerts + telemetry), an **alerts** page linked from the sidebar, **`/settings`** (account form + `updateMe`), and **`/admin/*`** (admin-only) for **users**, **sites** (sensors + thresholds + geo, optional **Google Maps** picker when `VITE_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY` is set), **devices** (API key on create/rotate; **installer stub** at `/admin/devices/$deviceId/install`), and **global sensor catalog** CRUD via GraphQL admin operations and [`apps/web/src/hooks/useAdmin.ts`](apps/web/src/hooks/useAdmin.ts).

## Where It Is Headed

**Active phase: Phase 6** — firmware installer (esp-web-tools), `POST /ingest/snapshot`, object storage, and dashboard snapshot display. Phases 1–5 (ingest, alerts, admin CRUD, dashboard shell) are complete. See [`docs/phase6-agent-prompt.md`](docs/phase6-agent-prompt.md) for the implementing-agent brief.

The web app uses **directory-based routes** under `apps/web/src/routes/_authed/` with page UI in `apps/web/src/features/` so day-to-day edits hot-reload without regenerating `routeTree.gen.ts`.

## Tech Stack

| Layer | Technology |
| ----- | ---------- |
| API | NestJS, GraphQL, REST ingest |
| Database | PostgreSQL, Kysely migrations and types |
| Web | TanStack Start, TanStack Router, TanStack Query, Tailwind CSS, `i18next` / `react-i18next` (en + es), light/dark/system theme |
| Auth | HTTP-only JWT cookies, bcrypt |

## Quick Start

You will need Node 22.12+, pnpm, and a PostgreSQL database.

```bash
pnpm install

cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
cp packages/db/.env.example packages/db/.env

pnpm db:setup
```

`pnpm db:setup` runs the migrations and seeds an admin user, a demo site, and a demo device. The seed script prints the demo device's plaintext API key once; save it if you want to test device ingestion.

Start the API and web app in separate terminals:

```bash
pnpm dev:api
pnpm dev:web
```

The API runs on `http://localhost:4000`, and the web app runs on `http://localhost:3333`.

## Local Environment

See [`.env.example`](.env.example) for the full environment contract. For local development, these are the important values:

**`apps/api/.env`**

```bash
DATABASE_PUBLIC_URL=postgres://postgres:postgres@localhost:5432/aquaponics
AUTH_SECRET=local-dev-secret
WEB_ORIGIN=http://localhost:3333
```

**`apps/web/.env`**

```bash
VITE_PUBLIC_API_URL=http://localhost:4000
# Optional: enables the admin site map picker (Google Maps JavaScript API).
# VITE_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY=
```

Migration and seed commands read `DATABASE_PUBLIC_URL` from `packages/db/.env` when run through pnpm filters, so keep that file populated too.

## Useful Commands

```bash
pnpm typecheck
pnpm build:api
pnpm build:web
pnpm migrate:deploy
pnpm seed
pnpm db:setup
```

## Documentation

- [`docs/development.md`](docs/development.md) — development commands, **folder-based routing** (`routes/_authed/…` + `features/*PageContent`), UI patterns (`PageBackLink`, loading)
- [`docs/greenfield-agent-handoff.md`](docs/greenfield-agent-handoff.md) — product spec and build phases
- [`docs/phase6-agent-prompt.md`](docs/phase6-agent-prompt.md) — agent bootstrap for **Phase 6** (firmware installer + camera snapshots)

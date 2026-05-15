# Aquaponics Site Monitoring

A small monitoring platform for aquaponics sites, built to collect field sensor data, give operators a clear dashboard, and surface problems before they turn into emergencies.

ESP-based devices send telemetry to a NestJS API, PostgreSQL stores readings and site data, and a TanStack Start dashboard gives users a place to log in and inspect site health.

## What Is Working

- **Device telemetry ingest:** devices can `POST /ingest` with an API key and submit readings for temperature, pH, water level, and flow.
- **Database foundation:** migrations, seed data, users, sites, devices, sensor catalog, and measurements are managed through `packages/db`.
- **Authenticated API:** the dashboard API uses GraphQL, HTTP-only JWT cookies, bcrypt password hashing, and role-aware access checks.
- **Web dashboard shell:** TanStack Start is wired up with login, session loading, protected routes, and early site/measurement GraphQL reads.

## Where It Is Headed

The MVP is being built in phases toward a practical operator dashboard: site lists, per-sensor charts, active alerts, admin tools, and eventually firmware/camera support for field devices.

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

- [`docs/development.md`](docs/development.md) covers day-to-day development, commands, and web conventions.

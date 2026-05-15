# Development guide

Internal reference for contributors. See the [product spec](greenfield-agent-handoff.md) for full phase definitions, GraphQL contract, and engineering constraints.

## Requirements

- **Node 22.12+** — required by `@tanstack/react-start`, current Vite, and the root `engines` field. Older versions will fail the web build.
- **pnpm** — install from the repo root:

```bash
pnpm install
```

## Environment

The app uses **`DATABASE_PUBLIC_URL`** for Postgres. On Railway this is the externally-reachable URL; do not substitute `DATABASE_URL` without an explicit decision.

Copy the relevant example files and fill in real values:

| File | Purpose |
| ---- | ------- |
| `.env.example` | Repo root; Railway-annotated full list |
| `apps/api/.env.example` | Local API defaults |
| `apps/web/.env.example` | Web dev defaults |
| `packages/db/.env.example` | Migration/seed script defaults |

Minimum `apps/api/.env` for local development:

```bash
DATABASE_PUBLIC_URL=postgres://postgres:postgres@localhost:5432/aquaponics
AUTH_SECRET=local-dev-secret
WEB_ORIGIN=http://localhost:3333   # enables CORS for local web app
```

Minimum `apps/web/.env`:

```bash
VITE_PUBLIC_API_URL=http://localhost:4000
```

`migrate:deploy`, `seed`, and `db:setup` read `DATABASE_PUBLIC_URL` from `packages/db/.env` when run via pnpm filter. Keep it populated there, or export the variable in your shell.

Do not commit real `.env` files.

## Common commands

Run from the repo root:

```bash
pnpm typecheck

pnpm dev:api              # builds packages/db first, then nest start --watch on :4000
pnpm dev:web              # TanStack Start dev server on :3333

pnpm build:api
pnpm build:web

pnpm start:api
pnpm start:web            # production server from apps/web/.output

pnpm migrate:deploy       # run before seed on a new / empty database
pnpm seed
pnpm db:setup             # migrate + seed in one shot

pnpm --filter @aquaponics/web codegen   # regenerate web GraphQL types after API schema changes
```

## Adding and pinning dependencies

All `package.json` files use **exact** versions (no `^` / `~`). Use `--save-exact` when adding:

```bash
pnpm add --filter @aquaponics/api --save-exact some-package@1.2.3
pnpm add --filter @aquaponics/web -D --save-exact some-dev-package@4.5.6
```

If you installed without `--save-exact`:

1. Run `pnpm install` to update the lockfile.
2. Find the resolved version in `pnpm-lock.yaml` (under the package's `importers` block) or via `pnpm --filter <pkg> list <dep>`.
3. Pin that exact string in `package.json`.
4. Re-run `pnpm install` and `pnpm typecheck` to confirm.

Always add from the **monorepo root** with `--filter` so the dependency lands on the correct workspace package.

## Web dashboard conventions (`apps/web`)

### Folder layout

| Path | Role |
| ---- | ---- |
| `src/hooks/` | React hooks only (`useQuery` / `useMutation` wrappers) |
| `src/api/` | Non-hook data access for route `beforeLoad` |
| `src/utils/` | Generic non-hook utilities (e.g. `graphqlRequest`) |
| `src/query-client.ts` | Shared TanStack `queryClient` singleton |
| `src/gql/` | GraphQL operations (`*.graphql`) + codegen output (`src/gql/generated/`) |
| `src/routes/` | TanStack Router file-based routes |

### Hook rules (`src/hooks/`)

- Every export must be a React hook — no plain functions.
- **Naming:** `use<Resource>` for queries (e.g. `useMe`, `useSites`); `use<Resource>Mutate` for mutations (e.g. `useLoginMutate`).
- **Destructure** at the call site — never hold the whole result object:
  ```typescript
  const { data: me } = useMe();
  const { mutateAsync: mutateLogin, isPending: isLoginPending } = useLoginMutate();
  ```
- **Side-effects belong in the hook** — `invalidateQueries`, related refetches, etc. go in `onSuccess` / `onError` / `onSettled` on `useMutation`, not in the calling component.
- Routes and components must not import `~/gql/generated/...`, `graphql`, `useQuery`, or `useMutation` directly.

### Route auth guards (`src/api/session.ts`)

The root route calls `loadRootContext` once in its `beforeLoad`, which fetches the session user and injects `RouterContext` (`{ user }`). Every child route inherits this without re-fetching.

For protected or guest-only routes use the one-liner guards:

```typescript
// protected route — redirect to /login if not authenticated
beforeLoad: ({ context }) => requireAuth(context)

// guest-only route — redirect to /sites if already authenticated
beforeLoad: ({ context }) => requireGuest(context)
```

Never call `fetchSessionUser` directly from route files.

### GraphQL codegen

Operations live in `src/gql/*.graphql`. After adding or changing an operation:

```bash
pnpm --filter @aquaponics/web codegen
```

Generated types land in `src/gql/generated/` (gitignored; regenerate as needed).

## Dev server notes

**`pnpm dev:web`** — uses `tanstackRouterGenerator` (not the full composed `tanstackRouter` plugin). The composed plugin can emit a **Duplicate declaration "hot"** Babel error on routes that have both `beforeLoad` and `component`. The generator still rebuilds `src/routeTree.gen.ts` on route changes; if you see a reload loop after renaming files, stop the server, optionally delete `src/routeTree.gen.ts`, and restart.

**`pnpm dev:api`** — compiles `packages/db` first, then runs `nest start --watch`. This is required because Nest GraphQL reads TypeScript decorator metadata that `tsx` does not emit. If you change only `packages/db`, restart `pnpm dev:api` or run `pnpm --filter @aquaponics/db build` manually. After changing GraphQL fields, restart `pnpm dev:api` so `apps/api/schema.graphql` is updated, then re-run codegen.

## Database

Migrations: `packages/db/src/migrations/` — run with `pnpm migrate:deploy`.

Core tables: `users`, `sites`, `user_sites`

Ingest tables: `sensor_catalog`, `devices`, `measurements` (composite PK `(taken_at, id)`; Timescale-upgrade-ready)

`pnpm seed` creates admin + viewer users, a demo site, MVP catalog rows, and a demo device. The device's **plaintext API key is printed once** — only the SHA-256 hash is stored. Re-seed on a fresh DB to get a new key.

If seed fails with _relation "sites" does not exist_, run `pnpm migrate:deploy` first.

## API surface

| Method | Path | Notes |
| ------ | ---- | ----- |
| `GET` | `/health` | Returns `{ ok: true }` |
| `POST` | `/graphql` | GraphQL; auth via HTTP-only cookie |
| `POST` | `/ingest` | Device telemetry; header `x-api-key` |

GraphQL operations: `login`, `logout`, `getMe`, `adminUsers` (admin only), `getSites`, `getSite`, `getMeasurements`, `getSensorMeasurements`.

`apps/api/schema.graphql` is the SDL used by web codegen. Commit it when the contract changes.

### Device ingest example

```bash
curl -sS -X POST "$API/ingest" \
  -H "content-type: application/json" \
  -H "x-api-key: YOUR_SEED_DEVICE_API_KEY" \
  -d '{"deviceId":"seed-device-1","timestamp":"2026-05-15T16:00:00.000Z","readings":{"temperature":22.1}}'
```

## Railway deployment

Both services use **repo root** as the root directory so builds can access `packages/db`.

| Setting | API service | Web service |
| ------- | ----------- | ----------- |
| Build command | `pnpm build:api` | `pnpm build:web` |
| Start command | `pnpm start:api` | `pnpm start:web` |
| Release command | `pnpm migrate:deploy` | — |
| Watch paths | `apps/api/**`, `packages/db/**`, `pnpm-lock.yaml` | `apps/web/**`, `packages/db/**`, `pnpm-lock.yaml` |

Required env vars (API): `DATABASE_PUBLIC_URL`, `AUTH_SECRET`, `NODE_ENV=production`, `WEB_ORIGIN`, `PG_POOL_MAX=3`. Railway sets `PORT` automatically. Node 22.12+ must match the `engines` field.

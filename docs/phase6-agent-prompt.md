# Phase 6 agent prompt — Aquaponics Site Monitoring

Hand this document (or a link to it) to an implementing agent when starting **Phase 6 — Firmware installer + camera support**. Phases 1–5 are **done**. Extend the repo per spec; do not re-architect prior work.

## Read first (in order)

1. [`AGENTS.md`](../AGENTS.md) — repo conventions, key paths, constraints
2. [`docs/development.md`](development.md) — commands, env, web patterns (routes vs features, styling)
3. [`docs/greenfield-agent-handoff.md`](greenfield-agent-handoff.md) — **authoritative** Phase 6 scope, ingest/snapshot contracts, env vars, definition of done
4. [`README.md`](../README.md) — what is working today

**Node 22.12+**, **pnpm**, exact dependency versions (no `^` / `~`). Only commit when the user asks.

---

## Project snapshot

**Stack:** pnpm monorepo — `apps/api` (NestJS GraphQL + REST ingest), `apps/web` (TanStack Start + TanStack Query + i18n en/es + shadcn/Tailwind), `packages/db` (Kysely migrations). Railway deployment; Postgres via **`DATABASE_PUBLIC_URL`** only.

### Done (Phases 1–5)

- Auth: HTTP-only JWT cookie, `getMe`, RBAC (`admin` / `site_manager` / `site_viewer`)
- `POST /ingest` — telemetry, rate limit, measurements, alerts (range + heuristics), `device_offline` sync
- **Ingest commands already implemented** in `apps/api/src/ingest/ingest.service.ts`: response includes `reportIntervalSeconds`, `snapshotIntervalSeconds`, `captureImageNow` (true when site has any active alert)
- GraphQL dashboard: sites, charts, alerts, resolve, settings `updateMe`
- Admin: users/sites/devices/sensor catalog CRUD; device `hasCamera`, intervals; API key on create/rotate
- Web: thin routes under `apps/web/src/routes/_authed/`, page UI in `apps/web/src/features/*PageContent.tsx`; hooks only in `apps/web/src/hooks/`; shared **`PageBackLink`** for back navigation
- Installer **stub** only: `apps/web/src/features/admin/devices/admin-device-install-page-content.tsx` at `/admin/devices/$deviceId/install`

### Migrations today

`0001`–`0005` — **no** `device_snapshots` table yet. `devices` already has `report_interval_seconds`, `snapshot_interval_seconds`, `has_camera` (migration `0002`).

### Not implemented (Phase 6 — your work)

| Area | Status |
|------|--------|
| `device_snapshots` table + Kysely types | Missing |
| `StorageModule` (S3-compatible upload + presigned reads) | Missing |
| `POST /ingest/snapshot` (multipart JPEG) | Missing — controller only has `POST /ingest` |
| GraphQL: latest snapshot for site/device detail | Not in `apps/api/schema.graphql` yet |
| Dashboard: show latest camera image on site detail | Missing |
| `firmware/aquaponics-node/` PlatformIO project | Missing (outside pnpm workspace) |
| `public/firmware/<board>/firmware.bin` + config patch region | Missing |
| esp-web-tools install wizard on admin install page | Missing |

---

## Phase 6 requirements (from spec)

### Exit criteria (must all pass)

1. Install wizard flashes device (esp-web-tools; placeholder `firmware.bin` OK until real PlatformIO build)
2. `POST /ingest` continues to return commands (already works — verify, do not break)
3. `POST /ingest/snapshot` stores JPEG in object storage + metadata in `device_snapshots`
4. Active site alert → `captureImageNow: true` on next telemetry ingest (already implemented — verify end-to-end with snapshot upload)
5. Dashboard shows latest snapshot on site/device detail when present

### Deliverables

1. **DB:** migration for `device_snapshots` (metadata only: `device_id`, `site_id`, `taken_at`, `ingested_at`, `content_type`, `byte_size`, `storage_bucket`, `storage_key`). No image bytes in Postgres.
2. **API `StorageModule`:** S3-compatible client; env: `OBJECT_STORAGE_ENDPOINT`, `OBJECT_STORAGE_REGION`, `OBJECT_STORAGE_BUCKET`, `OBJECT_STORAGE_ACCESS_KEY_ID`, `OBJECT_STORAGE_SECRET_ACCESS_KEY`, optional `OBJECT_STORAGE_FORCE_PATH_STYLE`. Return **503** on snapshot ingest if storage not configured (allowed during dev).
3. **`POST /ingest/snapshot`:** `multipart/form-data` — required parts `metadata` (JSON string: `{ deviceId, timestamp }` UTC `Z`) and `image` (`image/jpeg`, max 5 MB); `x-api-key`; same per-device rate limit as telemetry; response `{ ok: true }` only.
4. **GraphQL:** expose latest snapshot metadata + presigned URL for authorized users on site detail; extend `adminDevice` with recent snapshot metadata per spec. Update schema → `pnpm --filter @aquaponics/web codegen`.
5. **Web installer:** replace stub at `/admin/devices/$deviceId/install` with esp-web-tools wizard: Wi-Fi, API URL, sensor→GPIO map for MVP keys (`temperature`, `ph`, `waterLevel`, `waterFlow`), optional camera flag, intervals. Serve patched firmware from static `public/firmware/<board>/firmware.bin` with 2 KiB config region (`__UD_CFG_BEGIN__` / `__UD_CFG_END__`); in-memory manifest from patched bytes is fine.
6. **Firmware:** scaffold `firmware/aquaponics-node/` (PlatformIO, **not** in pnpm workspace); placeholder binary acceptable.
7. **Web dashboard:** latest snapshot on `/sites/$siteId` (and admin device views if spec says so).
8. Update `README.md`, `AGENTS.md` baseline, and `.env.example` files for new vars.

### Non-goals

Redis/queues, microservices, firmware CI, real CYD board (stub “coming soon” OK), TLS pinning, Timescale migration.

---

## Contracts (follow handoff — do not guess)

**Telemetry** — existing `POST /ingest`; see `apps/api/src/ingest/ingest.schema.ts` and `ingest.service.ts`.

**Snapshot ingest** — separate endpoint; full rules in `docs/greenfield-agent-handoff.md` → “Camera snapshots” and “Response body (commands)”.

**Commands** — firmware reads intervals + `captureImageNow` from **telemetry** response only; snapshot endpoint does not return commands.

### Web conventions (strict)

- Routes: `apps/web/src/routes/` — `createFileRoute`, `beforeLoad`, import `*PageContent` from `~/features/...`
- Features: `apps/web/src/features/` — UI + `getRouteApi('/exact/route/id')` for params
- Hooks: `apps/web/src/hooks/` only for `useQuery`/`useMutation`; no GraphQL imports in routes/components/features
- Guards: `~/api/session.ts` — `requireAuth`, `requireAdmin`
- Pin exact versions when adding packages (`pnpm add --filter … --save-exact`)
- Back links: use **`PageBackLink`** from `~/components/layout/page-back-link` (see `docs/development.md` → UI patterns)

### API conventions

- Device ingest is REST only — never GraphQL
- One Node process; `@nestjs/schedule` already used for alerts
- Reuse `IngestRateLimiter` pattern for snapshot endpoint

---

## Suggested implementation order

1. Migration `0006_*` + types + seed sanity check
2. `StorageModule` + snapshot ingest service/controller in `apps/api/src/ingest/`
3. GraphQL types/resolvers for snapshot read URLs (sites module or new module)
4. Web: hooks + site detail snapshot UI
5. `public/firmware/` placeholder + esp-web-tools on install page
6. `firmware/aquaponics-node/` minimal PlatformIO scaffold
7. Manual smoke per definition of done; update docs

---

## Verification

```bash
pnpm install
pnpm typecheck
pnpm build:api
pnpm build:web
pnpm migrate:deploy
pnpm seed   # optional
pnpm dev:api   # :4000
pnpm dev:web   # :3333
```

### Manual smoke

- Login as admin; open site with charts
- `curl POST /ingest` with seed device key → `commands` present; create/keep active alert → `captureImageNow: true`
- `curl POST /ingest/snapshot` with JPEG multipart → row in `device_snapshots` + object in bucket (or 503 if storage unset locally)
- Admin install page loads esp-web-tools and references firmware path
- Site detail shows latest snapshot when metadata exists
- Non-admin cannot access `/admin/*`

---

## Key file paths

| Path | Role |
|------|------|
| `docs/greenfield-agent-handoff.md` | Phase 6 spec, snapshot multipart layout, env vars |
| `apps/api/src/ingest/` | Extend for `/ingest/snapshot` |
| `apps/api/schema.graphql` | Add snapshot GraphQL fields |
| `packages/db/src/migrations/` | New `device_snapshots` migration |
| `apps/web/src/features/admin/devices/admin-device-install-page-content.tsx` | Replace stub with wizard |
| `apps/web/src/features/sites/site-detail-page-content.tsx` | Add snapshot display |
| `apps/web/src/hooks/` | New snapshot-related hooks |
| `apps/web/src/components/layout/page-back-link.tsx` | Canonical back button |

---

## Constraints reminder

- Do not expose ingest on GraphQL
- Do not store image blobs in Postgres
- UTC timestamps everywhere
- Do not break existing alert/ingest behavior
- After meaningful progress: update `README.md` + `AGENTS.md` current baseline

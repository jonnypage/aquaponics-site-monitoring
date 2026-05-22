# Phase 6 agent prompt — Aquaponics Site Monitoring

Hand this document to an implementing agent for **Phase 6 — Firmware installer + camera support**. **Phases 1–6 MVP code is in the repo.** Remaining work is mostly **verification**, **production env** (object storage, real firmware binary), and **optional gaps** listed below.

## Read first (in order)

1. [`AGENTS.md`](../AGENTS.md) — repo conventions, key paths, current baseline
2. [`docs/development.md`](development.md) — commands, env, web patterns
3. [`docs/greenfield-agent-handoff.md`](greenfield-agent-handoff.md) — authoritative contracts
4. [`docs/phase6-verification.md`](phase6-verification.md) — **smoke test checklist** (run and record results)
5. [`README.md`](../README.md) — quick start and env vars

**Node 22.12+**, **pnpm**, exact dependency versions (no `^` / `~`). Only commit when the user asks.

---

## Current status (2026-05)

### Done in code

| Area | Status |
|------|--------|
| Migration **`0006_phase6_snapshots`** | `device_snapshots` + device `name` / `board` / `pin_map` |
| Migration **`0008_sensor_wiring_template`** | Catalog wire templates + install GPIO map v2 |
| **`StorageModule`** | S3-compatible upload + presigned GET |
| **`POST /ingest/snapshot`** | Multipart JPEG + rate limit; **503** if storage unset |
| **`POST /ingest` commands** | `reportIntervalSeconds`, `snapshotIntervalSeconds`, `captureImageNow` |
| GraphQL | `getSite.latestSnapshot`, `adminDevice.recentSnapshots` |
| Web site detail | `SiteLatestSnapshot` when metadata exists |
| Web install wizard | esp-web-tools, Wi‑Fi, wire→GPIO, `firmware-config-patch` v2, `pin_map` |
| **`firmware/aquaponics-node/`** | Telemetry + stub JPEG snapshot + v1/v2 pin config parser |
| **`apps/web/public/firmware/esp8266/firmware.bin`** | Gitignored; `firmware:ensure` (placeholder) or `firmware:copy` after `pio run` |

### Gaps / post-MVP

| Item | Notes |
|------|--------|
| **Firmware CI / deploy** | `firmware.bin` not in git; Railway (etc.) should `pio run` + `pnpm firmware:copy` before `build:web` — not wired yet |
| **Real camera driver** | Firmware sends minimal stub JPEG only |
| **Admin device snapshot gallery** | GraphQL `recentSnapshots` exists; device edit UI does not list images yet |
| **ESP32 CYD installer** | Not implemented |
| **Phase 7** | Notifications — [`phase7-agent-prompt.md`](phase7-agent-prompt.md) |

---

## Phase 6 exit criteria

| # | Criterion | Verify via |
|---|-----------|------------|
| 1 | Install wizard flashes device (placeholder OK for UI) | Chrome → `/admin/devices/$id/install` |
| 2 | `POST /ingest` returns `commands` | [`phase6-verification.md`](phase6-verification.md) §2 |
| 3 | `POST /ingest/snapshot` → DB row + object (or 503) | §3–4 |
| 4 | Active alert → `captureImageNow: true` | §5 |
| 5 | Site detail shows latest snapshot | §6 + login UI |

---

## Key paths

| Path | Role |
|------|------|
| `apps/api/src/ingest/` | `POST /ingest`, `POST /ingest/snapshot` |
| `apps/api/src/storage/` | `StorageModule` |
| `apps/api/src/snapshots/` | `SnapshotsService` |
| `packages/db/src/migrations/0006_phase6_snapshots.ts` | Snapshot metadata table |
| `packages/db/src/migrations/0008_sensor_wiring_template.ts` | Wire templates |
| `apps/web/src/features/admin/devices/admin-device-install-page-content.tsx` | Install wizard |
| `apps/web/src/utils/firmware-config-patch.ts` | Config region patch (v2 pins) |
| `firmware/aquaponics-node/` | PlatformIO firmware |
| `scripts/generate-firmware-placeholder.mjs` | `pnpm firmware:placeholder` |
| `scripts/ensure-firmware-binary.mjs` | `pnpm firmware:ensure` (`predev:web`) |
| `scripts/copy-firmware-build.mjs` | `pnpm firmware:copy` |

---

## Constraints

- Device ingest is REST only — never GraphQL
- No image bytes in Postgres
- UTC timestamps on ingest
- Do not break Phases 1–5 alert/ingest behavior
- After verification or fixes: update [`phase6-verification.md`](phase6-verification.md) results + `README.md` / `AGENTS.md` if behavior changes

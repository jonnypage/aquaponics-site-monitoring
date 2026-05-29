# Phase 6 agent prompt — Aquaponics Site Monitoring

Hand this document to an implementing agent for **Phase 6 — Firmware installer + camera support**. **Phases 1–6 MVP code is complete in the repo.** Remaining operator work: **Railway production env** and **§8 hardware snapshot reflash** (see verification).

## Read first (in order)

1. [`AGENTS.md`](../AGENTS.md) — repo conventions, key paths, current baseline
2. [`docs/development.md`](development.md) — commands, env, web patterns, Railway firmware build
3. [`docs/greenfield-agent-handoff.md`](greenfield-agent-handoff.md) — authoritative contracts
4. [`docs/phase6-verification.md`](phase6-verification.md) — smoke test checklist
5. [`docs/phase6-railway-production.md`](phase6-railway-production.md) — production sign-off
6. [`README.md`](../README.md) — quick start and env vars

**Node 22.12+**, **pnpm**, exact dependency versions (no `^` / `~`). Only commit when the user asks.

---

## Current status (2026-05-23)

### Done in code

| Area | Status |
|------|--------|
| Migration **`0006_phase6_snapshots`** | `device_snapshots` + device `name` / `board` / `pin_map` |
| Migration **`0008_sensor_wiring_template`** | Catalog wire templates + install GPIO map v2 |
| **`StorageModule`** | S3-compatible upload + presigned GET + prefix delete |
| **`POST /ingest/snapshot`** | Multipart JPEG + rate limit; **503** if storage unset |
| **`POST /ingest` commands** | `reportIntervalSeconds`, `snapshotIntervalSeconds`, `captureImageNow` |
| GraphQL | `getSite.latestSnapshot`, `adminDevice.recentSnapshots` |
| Web site detail | `SiteLatestSnapshot` + map/snapshot row layout |
| Web device edit | **`AdminDeviceRecentSnapshots`** gallery |
| Web install wizard | esp-web-tools, Wi‑Fi, wire→GPIO, `firmware-config-patch` v2, `pin_map`; ESP32 CYD disabled + roadmap link |
| Admin site edit | Reset measurements + clear site snapshots |
| **`firmware/esp-8266-d1-mini/`** | Telemetry + placekittens JPEG (chunked HTTP download) + v1/v2 pins |
| **Firmware deploy hook** | [`scripts/ensure-or-build-firmware.mjs`](../scripts/ensure-or-build-firmware.mjs) — real build on CI/Railway/`FIRMWARE_BUILD=real` |
| **`apps/web/public/firmware/esp8266/firmware.bin`** | Gitignored; `firmware:build` or placeholder locally |

### Post-MVP / operator

| Item | Notes |
|------|--------|
| **Railway storage** | Set `OBJECT_STORAGE_*` on API — [`phase6-railway-production.md`](phase6-railway-production.md) |
| **§8 snapshot E2E** | Re-flash after chunked-download fix; confirm `Snapshot uploaded` on serial |
| **Real camera driver** | Firmware uses placekittens stub, not hardware |
| **ESP32 CYD installer** | Roadmap only — [`docs/esp32-cyd-roadmap.md`](esp32-cyd-roadmap.md) |
| **Phase 7** | Notifications — [`phase7-agent-prompt.md`](phase7-agent-prompt.md) |

---

## Phase 6 exit criteria

| # | Criterion | Verify via |
|---|-----------|------------|
| 1 | Install wizard flashes device (real binary on prod) | Chrome → `/admin/devices/$id/install` |
| 2 | `POST /ingest` returns `commands` | [`phase6-verification.md`](phase6-verification.md) §2 |
| 3 | `POST /ingest/snapshot` → DB row + object (or 503) | §3–4 |
| 4 | Active alert → `captureImageNow: true` | §5 |
| 5 | Site detail shows latest snapshot | §6 + login UI |

---

## Key paths

| Path | Role |
|------|------|
| `apps/api/src/ingest/` | `POST /ingest`, `POST /ingest/snapshot` |
| `apps/api/src/storage/` | `StorageModule` (upload, presign, delete by prefix) |
| `apps/api/src/snapshots/` | `SnapshotsService` |
| `apps/web/src/components/admin/admin-device-recent-snapshots.tsx` | Device edit snapshot gallery |
| `apps/web/src/features/admin/devices/admin-device-install-page-content.tsx` | Install wizard |
| `apps/web/src/utils/firmware-config-patch.ts` | Config region patch (v2 pins) |
| `firmware/esp-8266-d1-mini/` | PlatformIO ESP8266 firmware |
| `scripts/ensure-or-build-firmware.mjs` | `prebuild:web` / `predev:web` hook |
| `scripts/build-firmware.mjs` | `pnpm firmware:build` |
| `apps/web/public/firmware/esp32-cyd/` | CYD placeholder README |

---

## Constraints

- Device ingest is REST only — never GraphQL
- No image bytes in Postgres
- UTC timestamps on ingest
- Do not break Phases 1–5 alert/ingest behavior
- After operator verification: update [`phase6-verification.md`](phase6-verification.md) results

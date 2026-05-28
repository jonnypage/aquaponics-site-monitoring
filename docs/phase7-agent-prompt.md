# Phase 7 agent prompt — Notifications & alert policy (planned)

**Status:** **Not started — deferred.** Phases 1–6 are the current MVP. Do **not** implement Phase 7 until the team is ready to configure and operate real notifications (Resend email first, then optional SMS / WhatsApp / Signal).

Hand this document to an implementing agent when starting **Phase 7**. Extend the repo per spec; do not re-architect Phases 1–6 without an explicit product decision.

## Read first (in order)

1. [`AGENTS.md`](../AGENTS.md) — repo conventions
2. [`docs/greenfield-agent-handoff.md`](greenfield-agent-handoff.md) — **Phase 7** section + existing alert/scheduler behavior
3. [`docs/development.md`](development.md) — env vars, deployment
4. [`README.md`](../README.md) — current status

---

## Why Phase 7 is deferred

- **Alert rows and dashboard UI** exist today (ingest + scheduler create/update `alerts`; `/alerts` and per-site sections).
- **Email delivery** is implemented via Resend (`ResendMailerService`, scheduler ~60s) but is **optional**: without `RESEND_API_KEY` and `ALERT_FROM_EMAIL`, the API skips sending mail.
- **No production notification setup** is in place yet; expanding channels before operators depend on alerts would be premature.

Phase 7 is the right time to: turn on email reliably, define **who** gets **what** on **which channel**, and add mobile messaging if still desired.

---

## Product direction (agreed)

### Staging / calibration sites (no schema change for MVP)

Use a **normal site** (e.g. “Device staging” / “Calibration”) for pre-production ingest validation:

- Create it via **Admin → Sites** like any other site.
- Assign test devices to that site while flashing firmware and validating readings (devices support **nullable `site_id`**, assign/switch/reassign on device edit).
- **Do not** add the staging site to `user_sites` for `site_manager` / `site_viewer` users — only **`admin`** sees all sites in `getSites`; assigned users never see it.
- When a device moves to a production site, **historical measurements stay on the staging site** (same as any site reassignment).

No `is_internal` site flag is required unless staging appears in operator UI by mistake and becomes a problem.

### Site-level notification policy (likely Phase 7)

Staging and future edge cases need **per-site control** over outbound notifications, separate from anomaly detection:

| Concept | Purpose |
| -------- | -------- |
| **`suppress_notifications`** (or `do_not_alert`) | Site opts out of **outbound** notify (email/SMS/etc.). Alerts may still be written to DB for dashboard/debug. |
| **`notification_min_severity`** (optional) | e.g. `none` \| `critical` \| `warning` — minimum severity before any channel fires. |

**Suggested rollout:**

1. **V1:** `sites.suppress_notifications` boolean — scheduler skips all channels for that site.
2. **V2:** `notification_min_severity` per site.
3. **V3:** per-user or per-site channel preferences (email vs SMS).

Hook points in current code:

- [`apps/api/src/scheduler/scheduler.service.ts`](../apps/api/src/scheduler/scheduler.service.ts) — critical re-notify loop + email send
- [`apps/api/src/alerts/alerts.service.ts`](../apps/api/src/alerts/alerts.service.ts) — `resolveRecipientEmailsForSite`
- Optionally [`apps/api/src/ingest/ingest-alert.service.ts`](../apps/api/src/ingest/ingest-alert.service.ts) — skip alert **upsert** for suppressed sites (cleaner `/alerts` list) vs email-only suppress

### Multi-channel notifications (direction)

Channels under consideration (not committed to all in V1):

| Channel | Notes |
| -------- | ------ |
| **Email** | Already wired (Resend); make Phase 7 “production ready” (templates, env docs, failure logging). |
| **SMS** | Typical provider: Twilio / similar; E.164 numbers; rate limits and cost. |
| **WhatsApp** | Business API provider (e.g. Twilio, Meta Cloud API); template messages often required for outbound. |
| **Signal** | No official business API like SMS; may mean Signal-cli/self-hosted bridge or a third-party gateway — **evaluate legal/ops constraints** before committing. |

**Architecture sketch (when implementing):**

```text
Scheduler / ingest (alert created)
    → NotificationPolicyService (site flags, severity, cooldown)
    → NotificationDispatcher
         → EmailChannel (Resend)
         → SmsChannel (?)
         → WhatsAppChannel (?)
         → SignalChannel (?)
```

- Keep **one Node process** MVP assumption; no Redis/queues unless volume forces it.
- Reuse **`alerts.last_notified_at`** + `COOLDOWN_MINUTES` per `(site, type)` for email; extend or add `notification_deliveries` table if per-channel dedupe is needed.
- Recipients: today = **all admins** + **`user_sites` assignees** for the site; Phase 7 may add per-user phone numbers and channel opt-in.

---

## Phase 7 scope (draft exit criteria)

Implement when ready; adjust with product sign-off.

### Must have

1. **Resend email** documented and deployable on Railway (`RESEND_API_KEY`, `ALERT_FROM_EMAIL`, `COOLDOWN_MINUTES`).
2. **`sites.suppress_notifications`** (name TBD) — migration + admin site form + scheduler respects flag (no email for suppressed sites).
3. **Admin site form** copy explaining staging sites: use suppress flag or loose thresholds to avoid noise until mobile channels exist.
4. **README / `.env.example`** — notification env contract.

### Should have

5. **`NotificationDispatcher`** interface — email implemented; stubs or feature flags for SMS/WhatsApp/Signal.
6. **Per-site `notification_min_severity`** (optional if suppress boolean is enough for staging).

### Could have (explicit non-goals for first Phase 7 slice)

- Signal/WhatsApp/SMS **live** integrations (can land as Phase 7b/c after email + policy).
- Per-user notification preferences UI.
- Webhooks / Slack (unless added to spec later).

---

## Out of scope (remain post-MVP)

- Redis/queues for notification delivery
- Guaranteed delivery / DLQ
- Two-way chat on Signal/WhatsApp

See **Post-MVP / deferred work** in [`greenfield-agent-handoff.md`](greenfield-agent-handoff.md) for infra items unrelated to notifications.

---

## Verification (when Phase 7 starts)

- Staging site with `suppress_notifications: true` — ingest still works; alerts optional in DB; **no** email.
- Production site with Resend configured — critical alert sends email after cooldown.
- Non-admin without staging assignment — cannot `getSite` staging id (403).

---

## Key paths (existing)

| Path | Role |
|------|------|
| `apps/api/src/alerts/` | `getAlerts`, `resolveAlert`, `ResendMailerService` |
| `apps/api/src/scheduler/scheduler.service.ts` | Offline sync + critical email loop |
| `apps/api/src/ingest/ingest-alert.service.ts` | Alert upsert on ingest |
| `apps/web/src/features/alerts/` | Dashboard alerts UI |

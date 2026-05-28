# Development guide

Internal reference for contributors. See the [product spec](greenfield-agent-handoff.md) for full phase definitions, GraphQL contract, and engineering constraints.

## Requirements

- **Node 22.12+** — required by `@tanstack/react-start`, current Vite, and the root `engines` field. Older versions will fail the web build.
- **pnpm** — install from the repo root:

```bash
pnpm install
```

## Environment

The app uses **`DATABASE_PUBLIC_URL`** for Postgres (env name is fixed in code). On Railway, point that variable at the Postgres **private** URL (`DATABASE_URL` reference), not the public TCP proxy — see [`phase6-railway-production.md`](phase6-railway-production.md). Local dev uses `localhost`.

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

Optional on the API (Phase 4 email): `RESEND_API_KEY`, `ALERT_FROM_EMAIL`, and `COOLDOWN_MINUTES` (defaults to 45). Without Resend env vars, device-offline and critical-alert scheduler jobs still run; email sends are skipped with a warning in logs.

Minimum `apps/web/.env`:

```bash
VITE_PUBLIC_API_URL=http://localhost:4000
```

When flashing devices locally, add a **separate** LAN URL for firmware (do not point `VITE_PUBLIC_API_URL` at your LAN IP while using the dashboard on `localhost` — login cookies are cross-site and will fail):

```bash
VITE_DEVICE_API_ORIGIN=http://192.168.1.106:4000
```

Use your Mac’s LAN address (`ipconfig getifaddr en0`). Restart `pnpm dev:web` after changing `.env`.

`migrate:deploy`, `seed`, and `db:setup` read `DATABASE_PUBLIC_URL` from `packages/db/.env` when run via pnpm filter. Keep it populated there, or export the variable in your shell.

Do not commit real `.env` files.

## Firmware binary (install wizard)

The ESP8266 image at `apps/web/public/firmware/esp8266/firmware.bin` is **gitignored**. Source lives in [`firmware/aquaponics-node/`](../firmware/aquaponics-node/).

| Script | Purpose |
| ------ | ------- |
| `pnpm firmware:build` | PlatformIO build + copy to `apps/web/public/firmware/esp8266/firmware.bin` |
| `pnpm firmware:monitor` | Serial monitor at **115200** (pass `-- -p /dev/cu.…` for port) |
| `pnpm firmware:ensure` | Create placeholder if `firmware.bin` is missing (used by `predev:web` / `prebuild:web`) |
| `pnpm firmware:placeholder` | Force-regenerate placeholder (config markers only; **not** runnable on hardware) |
| `pnpm firmware:copy` | Copy only (after a manual `pio run` in `firmware/aquaponics-node`) |

```bash
pnpm firmware:build
```

Re-copy after any C++ change before USB flash. USB install flow: [`docs/esp8266-usb-macos.md`](esp8266-usb-macos.md).

GPIO pins on the install form are validated per board profile in `apps/web/src/utils/device-board-gpio.ts` (ESP8266 allowlist: 4, 5, 12, 13, 14, 17; flash/boot/serial pins error). Add profiles when new boards ship.

## Common commands

Run from the repo root:

```bash
pnpm typecheck

pnpm dev:api              # builds packages/db first, then nest start --watch on :4000
pnpm dev:web              # ensures firmware.bin (placeholder if missing), then :3333

pnpm firmware:build       # pio run + copy — real installer binary
pnpm build:api
pnpm build:web

pnpm start:api
pnpm start:web            # production server from apps/web/.output

pnpm migrate:deploy       # run before seed on a new / empty database
pnpm seed                 # users + demo data
pnpm seed:users           # admin + viewer only (existing users unchanged)
pnpm seed:demo            # demo site/device only
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
| `src/utils/` | Generic non-hook utilities (`graphqlRequest`, `cn`, `format` helpers) |
| `src/query-client.ts` | Shared TanStack `queryClient` singleton |
| `src/gql/` | GraphQL operations (`*.graphql`) + codegen output (`src/gql/generated/`) |
| `src/i18n/` | `i18next` bootstrap (`i18n.ts`), **`supported-languages.ts`** (codes + `normalizeToSupportedLanguage` — keep in sync with locale files) |
| `src/theme/` | `ThemeProvider` + `dashboard-theme-storage.ts` + head inline script (`theme-inline-bootstrap.ts`); `useDashboardTheme()` in layout/header only after `ThemeProvider` wraps the tree |
| `src/locales/` | Bundled locale JSON per language (`en.json`, `es.json`, …); same nested shape in every file. |
| `src/components/i18n/` | `I18nDocumentSync` — syncs `document.title` and `<html lang>` with the active locale on the client. |
| `src/components/ui/` | shadcn/ui primitives (`button`, `card`, `tabs`, `chart`, …) — add new ones here, do not inline Radix usage in pages |
| `src/components/layout/` | App shell: `DashboardShell`, `AppSidebar`, `AppHeader`, `PageHeader`, **`PageBackLink`** |
| `src/components/sites/` | Domain components for the site list / detail (`SiteCard`, `SiteStatusBadge`, `SensorChart`, `TimeRangeTabs`) |
| `src/routes/` | **Thin** TanStack Router wiring only (`createFileRoute`, `beforeLoad`, `component` import). Directory layout under `_authed/` mirrors URLs — see below. |
| `src/features/` | Route-mounted page roots (`*PageContent`). Mirror URL areas (`sites/`, `admin/users/`, `auth/`). Daily UI work happens here for stable Vite HMR. |

### Routes directory layout (`src/routes/`)

Pathless dashboard shell at [`_authed.tsx`](../apps/web/src/routes/_authed.tsx); authenticated segments live under [`_authed/`](../apps/web/src/routes/_authed/):

```text
routes/
  __root.tsx
  index.tsx
  login.tsx
  _authed.tsx
  _authed/
    sites.tsx              # layout <Outlet />
    sites/index.tsx        # /sites
    sites/$siteId.tsx
    alerts.tsx
    settings.tsx
    admin.tsx              # requireAdmin + <Outlet />
    admin/index.tsx
    admin/users/...
    admin/sites/...
    admin/devices/...
    admin/sensors/...
```

Example leaf route:

```typescript
// routes/_authed/admin/devices/$deviceId/edit.tsx
import { createFileRoute } from "@tanstack/react-router";
import { AdminDeviceEditPageContent } from "~/features/admin/devices/admin-device-edit-page-content";

export const Route = createFileRoute("/_authed/admin/devices/$deviceId/edit")({
  component: AdminDeviceEditPageContent,
});
```

TanStack allows mixing this directory tree with root-level files (`_authed.tsx` + `_authed/` folder). After adding or renaming route **files**, restart `pnpm dev:web` (or run `pnpm build:web` once) so `routeTree.gen.ts` regenerates.

#### Routing migration (flat files → directory tree)

The web app previously used many flat route files (`_authed.sites.$siteId.tsx`, etc.). They were moved under **`src/routes/_authed/…`** so URLs stay the same but the filesystem mirrors the URL hierarchy.

| Before (flat) | After (directory) |
| ------------- | ----------------- |
| `_authed.sites.tsx` | `_authed/sites.tsx` (layout) + `_authed/sites/index.tsx` |
| `_authed.sites.$siteId.tsx` | `_authed/sites/$siteId.tsx` |
| `_authed.admin.devices.$deviceId.edit.tsx` | `_authed/admin/devices/$deviceId/edit.tsx` |

**Lessons learnt:**

- **Edit page UI in `src/features/`, not route files** — the router plugin watches `src/routes/` and regenerates `routeTree.gen.ts` on every route change, which often forces a full reload. Daily work in `*PageContent` under `src/features/` keeps Vite HMR fast.
- **Keep route files thin** — only `createFileRoute`, `beforeLoad`, and `component: …PageContent`. Putting forms, charts, or large JSX in route files also triggers **Duplicate declaration "hot"** Babel errors when `beforeLoad` and a fat `component` share the same module (see Dev server notes).
- **Use `getRouteApi` in features** — import `Route` from a route file into a feature couples them and breaks the split. Pass the exact route id string matching `createFileRoute('…')`.
- **Restart dev after route file add/rename/delete** — if `routeTree.gen.ts` is stale or you hit a reload loop, stop `pnpm dev:web`, optionally delete `src/routeTree.gen.ts`, restart.

### Route files vs feature page content

The Vite plugin `tanstackRouterGenerator` watches `src/routes/` and regenerates `src/routeTree.gen.ts` when route modules change. `router.tsx` imports that tree, so **editing route files often triggers a full page reload** (sometimes repeatedly).

**Put in `src/routes/*.tsx` only:**

- `export const Route = createFileRoute('…')({ … })`
- `beforeLoad` guards (`requireAuth`, `requireGuest`, `requireAdmin`) or redirects
- `component: SomePageContent` imported from `~/features/…`
- Root shell (`__root.tsx`): `head`, `shellComponent`, `loadRootContext`

**Put in `src/features/**`:**

- Page UI, forms, local state, colocated skeletons/helpers
- Hooks usage (`~/hooks/…`) and composition of `~/components/…`
- For params or route context in a feature file, use TanStack’s **`getRouteApi`** (do not import `Route` from the route file):

```typescript
import { getRouteApi } from "@tanstack/react-router";

const routeApi = getRouteApi("/_authed/sites/$siteId");

export function SiteDetailPageContent() {
  const { siteId } = routeApi.useParams();
  // routeApi.useRouteContext() when needed
}
```

The route id string must match the `createFileRoute('…')` literal in the corresponding route file exactly.

**When you still need to restart `pnpm dev:web`:** adding/renaming/deleting route files, changing `beforeLoad`, or a reload loop after renames (stop dev, optionally delete `src/routeTree.gen.ts`, restart — see Dev server notes below).

### Internationalization (`i18next` + `react-i18next`)

- **Languages:** `en` (default) and `es`, each in **`src/locales/<lng>.json`**. Top-level keys group copy by screen or component (`meta`, `login`, `sitesPage`, …); use `shared` for strings reused in several places. Keep keys and nesting identical across locale files.
- **Components:** call `useTranslation()` (default namespace `translation`) and dotted paths, e.g. `t("login.title")`.
- **Choosing a language:** `i18next-browser-languagedetector` uses **`localStorage`** (key `i18nextLng`) then **`navigator`**. The authenticated **header** menu also exposes English / Español. Unknown browser languages fall back to `en` via `supportedLngs`.
- **Document `<title>` and `<html lang>`:** the root route still seeds `<title>` from **`en.json`** for the first paint; **`I18nDocumentSync`** (in `app.tsx`) updates title and `lang` on the client when i18n resolves. `<html>` uses `suppressHydrationWarning` so a Spanish `localStorage` choice does not warn on hydration.
- **TanStack Start:** `I18nextProvider` wraps the app in `src/app.tsx`; `react.useSuspense` is disabled on i18n so routes do not require a Suspense boundary for copy.
- **Adding another locale:** add `src/locales/<lng>.json`, import it in `src/i18n/i18n.ts`, add it to `resources` and `supportedLngs`, and extend `I18nDocumentSync` if you need a non-`en`/`es` BCP-47 tag on `<html>`.

### Session and GraphQL (SSR)

- **Session / refresh:** root `beforeLoad` loads the user via **`loadSessionUserFn`** (`src/api/load-session-user.ts`) on SSR (forwards the browser `Cookie` header to the API). **Local dev:** `localhost` cookies are sent to `:3333`, so refresh stays logged in on SSR. **Production split hosts** (web + API subdomains): set **`SESSION_COOKIE_DOMAIN`** on the API (see [`phase6-railway-production.md`](phase6-railway-production.md)) so SSR sees the cookie; without it, `_authed` **defers** auth to the client (`guardAuthedRoute` + `useMe`) instead of redirecting to login on refresh. Client hooks use **`graphqlRequest`** with `credentials: "include"`.

### Hook rules (`src/hooks/`)

- Every export must be a React hook — no plain functions.
- **Naming:** `use<Resource>` for queries (e.g. `useMe`, `useSites`); `use<Resource>Mutate` for mutations (e.g. `useLoginMutate`).
- **Destructure** at the call site — never hold the whole result object:
  ```typescript
  const { data: me } = useMe();
  const { mutateAsync: mutateLogin, isPending: isLoginPending } = useLoginMutate();
  ```
- **Side-effects belong in the hook** — `invalidateQueries`, related refetches, etc. go in `onSuccess` / `onError` / `onSettled` on `useMutation`, not in the calling component.
- Routes, feature page content, and components must not import `~/gql/generated/...`, `graphql`, `useQuery`, or `useMutation` directly.

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

### UI components and theming

- **Foundation:** Tailwind 3 + `tailwindcss-animate`. Theme tokens are CSS variables in `src/styles/tailwind.css` (`--background`, `--primary`, `--chart-1…5`, etc.); the Tailwind config exposes them as colour utilities.
- **Light / dark:** `tailwind.config.ts` uses **`darkMode: "class"`**. Light tokens live on `:root`; dark overrides on **`html.dark`**. `ThemeProvider` (`src/theme/theme-provider.tsx`, outer wrapper in `app.tsx`) sets **`light` / `dark` / `system`** (`localStorage` key `dashboard-theme`); **system** follows `prefers-color-scheme` and updates when the OS preference changes. A small inline script in the root route `head` runs before paint to limit theme flash. `document.documentElement.style.colorScheme` is set for native form controls. Charts (`ChartStyle` in `~/components/ui/chart`) use **`html.dark`** for dark chart CSS variables.
- **shadcn primitives** live in `src/components/ui/`. Build new screens out of these — do not import Radix or recharts directly in pages.
- **Reusable app components** group by domain: `src/components/layout/` for the shell, `src/components/sites/` for site-list and site-detail building blocks (cards, badges, charts, time-range tabs). **Feature page content** (`src/features/`) composes these; route files stay wiring-only.
- **Icons:** `lucide-react`. **Charts:** `recharts` via the `Chart*` primitives in `~/components/ui/chart`.
- **`cn(...)`** from `~/utils/cn` is the canonical class-name merger (`clsx` + `tailwind-merge`).

### UI patterns (buttons, loading, back navigation)

#### Back links — use `PageBackLink`

All “back to list / parent” controls use **`PageBackLink`** (`src/components/layout/page-back-link.tsx`):

- `Button` **`variant="outline"`** `size="sm"` with **`ChevronLeft`** + label
- Wrapped in `mb-4` by default; pass **`className="mb-0"`** when placing the link in a flex row beside other controls (e.g. device edit + “Open installer”)

```tsx
<PageBackLink to="/admin/sites">{t("admin.sites.backToSites")}</PageBackLink>

// Beside another button:
<div className="mb-4 flex flex-wrap items-center gap-2">
  <PageBackLink to="/admin/devices" className="mb-0">{t("admin.devices.listTitle")}</PageBackLink>
  <Button variant="outline" size="sm" asChild>...</Button>
</div>
```

Do **not** use `variant="ghost"` back links without the chevron — they were inconsistent across site detail vs admin edit pages before this component existed.

#### Loading — skeleton vs spinner

| Pattern | When to use |
| ------- | ----------- |
| **`Skeleton`** | List rows, chart areas, site detail layout while structure is known — **no** spinner on top |
| **`LoadingIndicator`** | Full-page or block load with no skeleton yet; centered `py-12` on edit/detail pages |
| **`ButtonPendingLabel`** | Inside submit/action buttons during mutations — keeps label visible + small spinner |

**Lesson:** avoid showing both skeleton placeholders **and** `LoadingIndicator` for the same view — pick one so the UI does not feel busy. Login, settings save, and admin form submits use `ButtonPendingLabel`; sites list, alerts, and chart sections use skeleton-only loading.

#### Primary actions

- List “create” actions: `Button` default variant in `PageHeader` `actions` slot
- Destructive: `variant="destructive"` on delete; secondary for rotate key / copy
- Form submit: single primary `Button` + `ButtonPendingLabel` for pending state

### GraphQL codegen

Operations live in `src/gql/*.graphql`. After adding or changing an operation:

```bash
pnpm --filter @aquaponics/web codegen
```

Generated types land in `src/gql/generated/` (gitignored; regenerate as needed).

## Dev server notes

**`pnpm dev:web`** — uses `tanstackRouterGenerator` (not the full composed `tanstackRouter` plugin). The composed plugin can emit a **Duplicate declaration "hot"** Babel error on routes that have both `beforeLoad` and `component` in the same file — keep route files thin (guards + `component` import only) and put UI in `src/features/`. The generator rebuilds `src/routeTree.gen.ts` when **route files** change; editing `src/features/` should hot-reload without regen. If you see a reload loop after renaming route files, stop the server, optionally delete `src/routeTree.gen.ts`, and restart.

**`pnpm dev:api`** — compiles `packages/db` first, then runs `nest start --watch`. This is required because Nest GraphQL reads TypeScript decorator metadata that `tsx` does not emit. If you change only `packages/db`, restart `pnpm dev:api` or run `pnpm --filter @aquaponics/db build` manually. After changing GraphQL fields, restart `pnpm dev:api` so `apps/api/schema.graphql` is updated, then re-run codegen.

## Database

Migrations: `packages/db/src/migrations/` — run with `pnpm migrate:deploy`.

Core tables: `users`, `sites`, `user_sites`

Ingest tables: `sensor_catalog`, `devices`, `measurements` (composite PK `(taken_at, id)`; Timescale-upgrade-ready)

| Command | Purpose |
| ------- | ------- |
| `pnpm seed` | Users + demo site/device (same as `seed:users` then `seed:demo`) |
| `pnpm seed:users` | Create admin/viewer if missing; does **not** reset passwords on existing users |
| `pnpm seed:demo` | Upsert demo site, seed device, pin map, enabled sensors; assigns viewer to demo site if that user exists |

`pnpm seed:demo` prints the demo device **plaintext API key** — only the SHA-256 hash is stored in the DB.

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
  -d '{"deviceId":"seed-device-1","timestamp":"2026-05-15T16:00:00.000Z","readings":{"ds18b20":22.1,"bncPhModule":6.9}}'
```

## Railway deployment

Both services use **repo root** as the root directory so builds can access `packages/db`.

| Setting | API service | Web service |
| ------- | ----------- | ----------- |
| Build command | `pnpm build:api` or `bash scripts/railway-build-api.sh` | See **Web firmware build** below — **not** the web script on API |
| Start command | `pnpm start:api` | `pnpm start:web` |
| Release command | `pnpm migrate:deploy` | — |
| Watch paths | `apps/api/**`, `packages/db/**`, `pnpm-lock.yaml` | `apps/web/**`, `firmware/**`, `packages/db/**`, `pnpm-lock.yaml`, `scripts/**` |

Required env vars (API): `DATABASE_PUBLIC_URL` (on Railway: reference Postgres **`DATABASE_URL`**, private — not the public proxy), `AUTH_SECRET`, `NODE_ENV=production`, `WEB_ORIGIN`, `PG_POOL_MAX=3`. Railway sets `PORT` automatically. Node 22.12+ must match the `engines` field.

**API snapshots (Phase 6):** set `OBJECT_STORAGE_ENDPOINT`, `OBJECT_STORAGE_REGION`, `OBJECT_STORAGE_BUCKET`, `OBJECT_STORAGE_ACCESS_KEY_ID`, `OBJECT_STORAGE_SECRET_ACCESS_KEY` on the API service (Railway Storage bucket credentials). Without these, `POST /ingest/snapshot` returns **503**.

### Web firmware build

`firmware.bin` is **gitignored**. `prebuild:web` runs [`scripts/ensure-or-build-firmware.mjs`](../scripts/ensure-or-build-firmware.mjs):

- **Local** (`pnpm dev:web` / `pnpm build:web`): placeholder if the file is missing (installer UI only).
- **CI / Railway**: builds real firmware when `RAILWAY_ENVIRONMENT` is set, `CI=true`, or `FIRMWARE_BUILD=real`.

**Recommended Railway web build** (Railpack — web service: `RAILPACK_CONFIG_FILE=railpack.web.json`, `RAILPACK_NO_SPA=1`; see [`railpack.web.json`](../railpack.web.json)):

```bash
bash scripts/railway-build-web.sh
```

or `pnpm build:web:railway`. Fallback env on web service: `RAILPACK_BUILD_APT_PACKAGES=python3,python3-pip,python3-venv,build-essential,git,curl,xz-utils` (not `RAILPACK_DEPLOY_APT_PACKAGES`).

**Avoid** `pip install platformio && …` as the build command — use the script after apt packages install.

Do not flash the placeholder binary to hardware.

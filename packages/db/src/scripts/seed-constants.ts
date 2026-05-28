import type { UserRole } from "../types.js";

export const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@local.dev";
export const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "changeme-admin";
export const ADMIN_NAME = process.env.SEED_ADMIN_NAME ?? "Seed Admin";

export const VIEWER_EMAIL = process.env.SEED_VIEWER_EMAIL ?? "viewer@local.dev";
export const VIEWER_PASSWORD = process.env.SEED_VIEWER_PASSWORD ?? "changeme-viewer";
export const VIEWER_NAME = process.env.SEED_VIEWER_NAME ?? "Seed Viewer";
export const VIEWER_ROLE: UserRole = "site_viewer";

export const DEFAULT_SITE_NAME = process.env.SEED_SITE_NAME ?? "Demo Site";

export const SEED_DEVICE_ID = process.env.SEED_DEVICE_ID ?? "seed-device-1";
export const SEED_DEVICE_API_KEY =
  process.env.SEED_DEVICE_API_KEY ?? "local-dev-ingest-key-change-in-prod-32chars";

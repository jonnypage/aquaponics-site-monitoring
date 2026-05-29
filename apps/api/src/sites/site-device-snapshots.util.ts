import type { Database } from "@aquaponics/db";
import type { Kysely } from "kysely";

export type SiteDeviceSnapshotSettingsRow = {
  deviceId: string;
  deviceName: string | null;
  hasCamera: boolean;
  snapshotsEnabled: boolean;
};

/** Per-device camera snapshot toggles for devices assigned to a site. */
export async function loadSiteDeviceSnapshotSettings(
  db: Kysely<Database>,
  siteId: string
): Promise<SiteDeviceSnapshotSettingsRow[]> {
  const rows = await db
    .selectFrom("devices")
    .select(["device_id", "name", "has_camera", "snapshots_enabled"])
    .where("site_id", "=", siteId)
    .where("has_camera", "=", true)
    .orderBy("device_id", "asc")
    .execute();

  return rows.map((r) => ({
    deviceId: r.device_id,
    deviceName: r.name,
    hasCamera: Boolean(r.has_camera),
    snapshotsEnabled: Boolean(r.snapshots_enabled)
  }));
}

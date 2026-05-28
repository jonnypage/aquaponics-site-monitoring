import type { Database, DevicePinMap } from "@aquaponics/db";
import { sensorKeysWithPinsFromDeviceMap } from "@aquaponics/db";
import type { Kysely } from "kysely";

export function siteSensorInstanceKey(deviceId: string, sensorKey: string): string {
  return `${deviceId}:${sensorKey}`;
}

export function parseSiteSensorInstanceKey(key: string): { deviceId: string; sensorKey: string } | null {
  const idx = key.indexOf(":");
  if (idx <= 0 || idx >= key.length - 1) {
    return null;
  }
  return { deviceId: key.slice(0, idx), sensorKey: key.slice(idx + 1) };
}

/** Ensure `site_sensor_catalog` rows exist for each wired sensor on the device. */
export async function syncSiteSensorCatalogForDevice(
  executor: Kysely<Database>,
  siteId: string,
  deviceId: string,
  pinMap: DevicePinMap | null
): Promise<void> {
  const catalogRows = await executor.selectFrom("sensor_catalog").select("key").execute();
  const catalogKeys = new Set(catalogRows.map((r) => r.key));
  const wiredKeys = sensorKeysWithPinsFromDeviceMap(pinMap).filter((key) => catalogKeys.has(key));

  if (wiredKeys.length === 0) {
    await executor
      .deleteFrom("site_sensor_catalog")
      .where("site_id", "=", siteId)
      .where("device_id", "=", deviceId)
      .execute();
    await executor
      .deleteFrom("sensor_thresholds")
      .where("site_id", "=", siteId)
      .where("device_id", "=", deviceId)
      .execute();
    return;
  }

  await executor
    .deleteFrom("site_sensor_catalog")
    .where("site_id", "=", siteId)
    .where("device_id", "=", deviceId)
    .where("sensor", "not in", wiredKeys)
    .execute();

  await executor
    .deleteFrom("sensor_thresholds")
    .where("site_id", "=", siteId)
    .where("device_id", "=", deviceId)
    .where("sensor", "not in", wiredKeys)
    .execute();

  const now = new Date();
  for (const sensor of wiredKeys) {
    await executor
      .insertInto("site_sensor_catalog")
      .values({
        site_id: siteId,
        device_id: deviceId,
        sensor,
        enabled: false,
        updated_at: now
      })
      .onConflict((oc) => oc.columns(["site_id", "device_id", "sensor"]).doNothing())
      .execute();
  }
}

export async function removeSiteSensorCatalogForDevice(
  executor: Kysely<Database>,
  siteId: string,
  deviceId: string
): Promise<void> {
  await executor
    .deleteFrom("site_sensor_catalog")
    .where("site_id", "=", siteId)
    .where("device_id", "=", deviceId)
    .execute();
  await executor
    .deleteFrom("sensor_thresholds")
    .where("site_id", "=", siteId)
    .where("device_id", "=", deviceId)
    .execute();
}

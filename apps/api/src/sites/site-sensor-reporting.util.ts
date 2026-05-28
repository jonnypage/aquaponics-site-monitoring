import type { Database } from "@aquaponics/db";
import type { Kysely } from "kysely";
import { SensorType } from "../sensors/sensor-type.types.js";
import { siteSensorInstanceKey } from "./site-sensor-sync.util.js";

export type SiteSensorReportingRow = {
  deviceId: string;
  deviceName: string | null;
  sensorKey: string;
  sensorType: SensorType;
  model: string;
  enabled: boolean;
  displayName: string;
  unit: string;
  sortOrder: number;
  icon: string | null;
};

/**
 * One row per wired sensor instance on each device assigned to the site.
 */
export async function loadSiteSensorReporting(db: Kysely<Database>, siteId: string): Promise<SiteSensorReportingRow[]> {
  const rows = await db
    .selectFrom("devices")
    .innerJoin("site_sensor_catalog", (join) =>
      join
        .onRef("site_sensor_catalog.device_id", "=", "devices.device_id")
        .onRef("site_sensor_catalog.site_id", "=", "devices.site_id")
    )
    .innerJoin("sensor_catalog", "sensor_catalog.key", "site_sensor_catalog.sensor")
    .select([
      "devices.device_id",
      "devices.name as device_name",
      "sensor_catalog.key",
      "sensor_catalog.sensor_type",
      "sensor_catalog.model",
      "sensor_catalog.display_name",
      "sensor_catalog.unit",
      "sensor_catalog.sort_order",
      "sensor_catalog.icon",
      "site_sensor_catalog.enabled"
    ])
    .where("devices.site_id", "=", siteId)
    .orderBy("devices.device_id", "asc")
    .orderBy("sensor_catalog.sort_order", "asc")
    .orderBy("sensor_catalog.key", "asc")
    .execute();

  return rows.map((r) => ({
    deviceId: r.device_id,
    deviceName: r.device_name,
    sensorKey: r.key,
    sensorType: r.sensor_type as SensorType,
    model: r.model,
    enabled: Boolean(r.enabled),
    displayName: r.display_name,
    unit: r.unit,
    sortOrder: r.sort_order,
    icon: r.icon
  }));
}

export async function loadSensorTypeByKey(db: Kysely<Database>): Promise<Map<string, SensorType>> {
  const rows = await db.selectFrom("sensor_catalog").select(["key", "sensor_type"]).execute();
  return new Map(rows.map((r) => [r.key, r.sensor_type as SensorType]));
}

export async function loadEnabledSensorsBySite(
  db: Kysely<Database>,
  siteIds: string[]
): Promise<Map<string, Set<string>>> {
  const map = new Map<string, Set<string>>();
  if (siteIds.length === 0) {
    return map;
  }

  const rows = await db
    .selectFrom("site_sensor_catalog")
    .select(["site_id", "device_id", "sensor"])
    .where("site_id", "in", siteIds)
    .where("enabled", "=", true)
    .execute();

  for (const r of rows) {
    let set = map.get(r.site_id);
    if (!set) {
      set = new Set();
      map.set(r.site_id, set);
    }
    set.add(siteSensorInstanceKey(r.device_id, r.sensor));
  }
  return map;
}

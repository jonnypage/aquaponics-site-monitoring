import type { Database } from "@aquaponics/db";
import type { Kysely } from "kysely";

export type SiteSensorReportingRow = {
  sensorKey: string;
  enabled: boolean;
  displayName: string;
  unit: string;
  sortOrder: number;
  icon: string | null;
};

/**
 * One row per global catalog sensor for the site: join `sensor_catalog` with optional
 * `site_sensor_catalog` row (enabled defaults false when missing).
 */
export async function loadSiteSensorReporting(db: Kysely<Database>, siteId: string): Promise<SiteSensorReportingRow[]> {
  const rows = await db
    .selectFrom("sensor_catalog")
    .leftJoin("site_sensor_catalog", (join) =>
      join.onRef("site_sensor_catalog.sensor", "=", "sensor_catalog.key").on("site_sensor_catalog.site_id", "=", siteId)
    )
    .select([
      "sensor_catalog.key",
      "sensor_catalog.display_name",
      "sensor_catalog.unit",
      "sensor_catalog.sort_order",
      "sensor_catalog.icon",
      "site_sensor_catalog.enabled as siteEnabled"
    ])
    .orderBy("sensor_catalog.sort_order", "asc")
    .orderBy("sensor_catalog.key", "asc")
    .execute();

  return rows.map((r) => ({
    sensorKey: r.key,
    enabled: Boolean(r.siteEnabled),
    displayName: r.display_name,
    unit: r.unit,
    sortOrder: r.sort_order,
    icon: r.icon
  }));
}

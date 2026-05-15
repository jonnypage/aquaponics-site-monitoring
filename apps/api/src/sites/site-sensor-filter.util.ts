import type { Database } from "@aquaponics/db";
import type { Kysely } from "kysely";

import { sensorCatalogKeyFromAlertType } from "./alert-sensor-key.util.js";

/** `site_id` → set of `sensor` keys with `enabled = false`. */
export async function loadDisabledSensorsBySite(
  db: Kysely<Database>,
  siteIds: string[]
): Promise<Map<string, Set<string>>> {
  const map = new Map<string, Set<string>>();
  if (siteIds.length === 0) {
    return map;
  }

  const rows = await db
    .selectFrom("site_sensor_catalog")
    .select(["site_id", "sensor"])
    .where("site_id", "in", siteIds)
    .where("enabled", "=", false)
    .execute();

  for (const r of rows) {
    let set = map.get(r.site_id);
    if (!set) {
      set = new Set();
      map.set(r.site_id, set);
    }
    set.add(r.sensor);
  }
  return map;
}

export function isSensorDisabledForSite(
  siteId: string,
  sensorKey: string,
  disabledBySite: Map<string, Set<string>>
): boolean {
  return disabledBySite.get(siteId)?.has(sensorKey) ?? false;
}

/** Drop alerts whose type is tied to a sensor disabled for that site. */
export function filterAlertsForEnabledSensorsOnly<T extends { site_id: string; type: string }>(
  rows: T[],
  disabledBySite: Map<string, Set<string>>
): T[] {
  return rows.filter((row) => {
    const sensorKey = sensorCatalogKeyFromAlertType(row.type);
    if (sensorKey == null) {
      return true;
    }
    return !isSensorDisabledForSite(row.site_id, sensorKey, disabledBySite);
  });
}

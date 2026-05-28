import type { Database } from "@aquaponics/db";
import type { Kysely } from "kysely";
import { SensorType } from "../sensors/sensor-type.types.js";

import {
  heuristicAlertDeviceId,
  heuristicAlertSensorType,
  rangeAlertPartsFromType
} from "./alert-sensor-key.util.js";
import { loadEnabledSensorsBySite, loadSensorTypeByKey } from "./site-sensor-reporting.util.js";
import { siteSensorInstanceKey } from "./site-sensor-sync.util.js";

/** `site_id` → set of `${deviceId}:${sensorKey}` with `enabled = false`. */
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
    .select(["site_id", "device_id", "sensor"])
    .where("site_id", "in", siteIds)
    .where("enabled", "=", false)
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

export function isSensorInstanceDisabledForSite(
  siteId: string,
  deviceId: string,
  sensorKey: string,
  disabledBySite: Map<string, Set<string>>
): boolean {
  return disabledBySite.get(siteId)?.has(siteSensorInstanceKey(deviceId, sensorKey)) ?? false;
}

function siteHasEnabledSensorOfType(
  siteId: string,
  sensorType: SensorType,
  enabledBySite: Map<string, Set<string>>,
  sensorTypeByKey: Map<string, SensorType>
): boolean {
  const enabled = enabledBySite.get(siteId);
  if (!enabled) {
    return false;
  }
  for (const instanceKey of enabled) {
    const sensorKey = instanceKey.slice(instanceKey.indexOf(":") + 1);
    if (sensorTypeByKey.get(sensorKey) === sensorType) {
      return true;
    }
  }
  return false;
}

function siteHasEnabledSensorInstance(
  siteId: string,
  deviceId: string,
  sensorKey: string,
  enabledBySite: Map<string, Set<string>>
): boolean {
  return enabledBySite.get(siteId)?.has(siteSensorInstanceKey(deviceId, sensorKey)) ?? false;
}

/** Drop alerts whose type is tied to a disabled sensor instance or disabled measurement family. */
export function filterAlertsForEnabledSensorsOnly<
  T extends { site_id: string; type: string; device_id?: string | null }
>(rows: T[], disabledBySite: Map<string, Set<string>>, enabledBySite: Map<string, Set<string>>, sensorTypeByKey: Map<string, SensorType>): T[] {
  return rows.filter((row) => {
    const rangeParts = rangeAlertPartsFromType(row.type);
    if (rangeParts != null) {
      return !isSensorInstanceDisabledForSite(row.site_id, rangeParts.deviceId, rangeParts.sensorKey, disabledBySite);
    }

    const heuristicDeviceId = heuristicAlertDeviceId(row.type);
    const sensorType = heuristicAlertSensorType(row.type);
    if (sensorType != null && heuristicDeviceId != null) {
      const enabledForDevice = [...(enabledBySite.get(row.site_id) ?? [])].some((key) =>
        key.startsWith(`${heuristicDeviceId}:`)
      );
      if (!enabledForDevice) {
        return false;
      }
      return siteHasEnabledSensorOfType(row.site_id, sensorType, enabledBySite, sensorTypeByKey);
    }

    return true;
  });
}

export async function loadAlertFilterContext(
  db: Kysely<Database>,
  siteIds: string[]
): Promise<{
  disabledBySite: Map<string, Set<string>>;
  enabledBySite: Map<string, Set<string>>;
  sensorTypeByKey: Map<string, SensorType>;
}> {
  const [disabledBySite, enabledBySite, sensorTypeByKey] = await Promise.all([
    loadDisabledSensorsBySite(db, siteIds),
    loadEnabledSensorsBySite(db, siteIds),
    loadSensorTypeByKey(db)
  ]);
  return { disabledBySite, enabledBySite, sensorTypeByKey };
}

export { isSensorInstanceDisabledForSite as isSensorDisabledForSite, siteHasEnabledSensorInstance };

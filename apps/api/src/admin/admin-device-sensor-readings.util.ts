import {
  sensorKeysWithPinsFromDeviceMap,
  type Database,
  type DevicePinMap
} from "@aquaponics/db";
import type { Kysely } from "kysely";
import { sql } from "kysely";
import { SensorType } from "../sensors/sensor-type.types.js";
import type { AdminDeviceSensorReadingModel } from "./admin.types.js";

type DeviceForReadings = {
  deviceId: string;
  pinMap?: Record<string, unknown> | null;
};

function readingKey(deviceId: string, sensorKey: string): string {
  return `${deviceId}:${sensorKey}`;
}

export async function loadAdminDeviceSensorReadings(
  db: Kysely<Database>,
  devices: readonly DeviceForReadings[]
): Promise<Map<string, AdminDeviceSensorReadingModel[]>> {
  const out = new Map<string, AdminDeviceSensorReadingModel[]>();
  if (devices.length === 0) {
    return out;
  }

  const keysByDevice = new Map<string, string[]>();
  const allSensorKeys = new Set<string>();

  for (const device of devices) {
    const pinMap =
      device.pinMap != null && typeof device.pinMap === "object"
        ? (device.pinMap as DevicePinMap)
        : null;
    const keys = sensorKeysWithPinsFromDeviceMap(pinMap);
    keysByDevice.set(device.deviceId, keys);
    for (const key of keys) {
      allSensorKeys.add(key);
    }
    out.set(device.deviceId, []);
  }

  const catalogByKey = new Map<
    string,
    {
      sensorType: SensorType;
      displayName: string;
      unit: string;
      sortOrder: number;
      icon: string | null;
    }
  >();

  if (allSensorKeys.size > 0) {
    const catalogRows = await db
      .selectFrom("sensor_catalog")
      .select(["key", "sensor_type", "display_name", "unit", "sort_order", "icon"])
      .where("key", "in", [...allSensorKeys])
      .execute();

    for (const row of catalogRows) {
      catalogByKey.set(row.key, {
        sensorType: row.sensor_type as SensorType,
        displayName: row.display_name,
        unit: row.unit,
        sortOrder: row.sort_order,
        icon: row.icon
      });
    }
  }

  const deviceIds = devices.map((d) => d.deviceId);
  const latestByKey = new Map<string, { value: number; takenAt: Date }>();

  if (deviceIds.length > 0) {
    const result = await sql<{
      device_id: string;
      sensor: string;
      value: number;
      taken_at: Date;
    }>`
      SELECT DISTINCT ON (device_id, sensor)
        device_id,
        sensor,
        value,
        taken_at
      FROM measurements
      WHERE device_id IN (${sql.join(deviceIds.map((id) => sql`${id}`))})
      ORDER BY device_id, sensor, taken_at DESC
    `.execute(db);

    for (const row of result.rows) {
      latestByKey.set(readingKey(row.device_id, row.sensor), {
        value: row.value,
        takenAt: new Date(row.taken_at as Date | string)
      });
    }
  }

  for (const device of devices) {
    const keys = keysByDevice.get(device.deviceId) ?? [];
    const readings = keys
      .map((sensorKey) => {
        const cat = catalogByKey.get(sensorKey);
        const latest = latestByKey.get(readingKey(device.deviceId, sensorKey));
        return {
          sensorKey,
          sensorType: cat?.sensorType ?? SensorType.temperature,
          displayName: cat?.displayName ?? sensorKey,
          unit: cat?.unit ?? "",
          icon: cat?.icon ?? null,
          sortOrder: cat?.sortOrder ?? 0,
          value: latest?.value ?? null,
          takenAt: latest?.takenAt ?? null
        };
      })
      .sort((a, b) => a.sortOrder - b.sortOrder || a.sensorKey.localeCompare(b.sensorKey))
      .map(({ sortOrder: _sortOrder, ...row }) => row);

    out.set(device.deviceId, readings);
  }

  return out;
}

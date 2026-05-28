import { Kysely, sql } from "kysely";
import type { Database } from "../types.js";
import { sensorKeysWithPinsFromDeviceMap, type DevicePinMap } from "../sensor-wiring.js";

function wiredKeysFromPinMap(pinMap: unknown): string[] {
  if (pinMap == null || typeof pinMap !== "object") {
    return [];
  }
  return sensorKeysWithPinsFromDeviceMap(pinMap as DevicePinMap);
}

export async function up(db: Kysely<Database>): Promise<void> {
  await db.schema
    .alterTable("site_sensor_catalog")
    .addColumn("device_id", "text", (col) => col.references("devices.device_id").onDelete("cascade"))
    .execute();

  await db.schema
    .alterTable("sensor_thresholds")
    .addColumn("device_id", "text", (col) => col.references("devices.device_id").onDelete("cascade"))
    .execute();

  const legacyCatalog = await db.selectFrom("site_sensor_catalog").selectAll().execute();
  const legacyThresholds = await db.selectFrom("sensor_thresholds").selectAll().execute();
  const devices = await db
    .selectFrom("devices")
    .select(["device_id", "site_id", "pin_map"])
    .where("site_id", "is not", null)
    .execute();

  const devicesBySite = new Map<string, typeof devices>();
  for (const d of devices) {
    if (!d.site_id) {
      continue;
    }
    const list = devicesBySite.get(d.site_id) ?? [];
    list.push(d);
    devicesBySite.set(d.site_id, list);
  }

  const thBySiteSensor = new Map<string, (typeof legacyThresholds)[number]>();
  for (const th of legacyThresholds) {
    thBySiteSensor.set(`${th.site_id}:${th.sensor}`, th);
  }

  for (const row of legacyCatalog) {
    const siteDevices = devicesBySite.get(row.site_id) ?? [];
    if (siteDevices.length === 0) {
      continue;
    }

    for (const device of siteDevices) {
      const pinKeys = wiredKeysFromPinMap(device.pin_map);
      const keysForDevice = pinKeys.length > 0 ? pinKeys : [row.sensor];
      if (!keysForDevice.includes(row.sensor)) {
        continue;
      }

      await db
        .insertInto("site_sensor_catalog")
        .values({
          site_id: row.site_id,
          device_id: device.device_id,
          sensor: row.sensor,
          enabled: row.enabled,
          updated_at: new Date()
        })
        .execute();

      const th = thBySiteSensor.get(`${row.site_id}:${row.sensor}`);
      if (th) {
        await db
          .insertInto("sensor_thresholds")
          .values({
            site_id: row.site_id,
            device_id: device.device_id,
            sensor: row.sensor,
            normal_min: th.normal_min,
            normal_max: th.normal_max,
            warning_delta: th.warning_delta,
            critical_delta: th.critical_delta,
            updated_at: new Date()
          })
          .execute();
      }
    }
  }

  await db.deleteFrom("site_sensor_catalog").where("device_id", "is", null).execute();
  await db.deleteFrom("sensor_thresholds").where("device_id", "is", null).execute();

  await db.schema
    .alterTable("site_sensor_catalog")
    .alterColumn("device_id", (col) => col.setNotNull())
    .execute();

  await db.schema
    .alterTable("sensor_thresholds")
    .alterColumn("device_id", (col) => col.setNotNull())
    .execute();

  await db.schema
    .alterTable("site_sensor_catalog")
    .dropConstraint("site_sensor_catalog_pkey")
    .execute();

  await db.schema
    .alterTable("site_sensor_catalog")
    .addPrimaryKeyConstraint("site_sensor_catalog_pkey", ["site_id", "device_id", "sensor"])
    .execute();

  await db.schema
    .alterTable("sensor_thresholds")
    .dropConstraint("sensor_thresholds_pkey")
    .execute();

  await db.schema
    .alterTable("sensor_thresholds")
    .addPrimaryKeyConstraint("sensor_thresholds_pkey", ["site_id", "device_id", "sensor"])
    .execute();

  await sql`DROP INDEX IF EXISTS alerts_one_active_per_site_type`.execute(db);
  await sql`
    CREATE UNIQUE INDEX alerts_one_active_per_site_type
    ON alerts (site_id, type)
    WHERE (status = 'active')
  `.execute(db);
}

export async function down(db: Kysely<Database>): Promise<void> {
  throw new Error("0010_device_scoped_site_sensors down migration is not supported");
}

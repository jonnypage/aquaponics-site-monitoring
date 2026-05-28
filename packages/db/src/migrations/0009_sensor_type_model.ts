import { Kysely, sql } from "kysely";
import type { Database } from "../types.js";
import type { SensorWiringTemplate } from "../sensor-wiring.js";
import { DEFAULT_SENSOR_CATALOG_ROWS } from "../sensor-types.js";

const GENERIC_WIRING: SensorWiringTemplate = {
  wires: [{ id: "signal", label: "Signal", color: "#3b82f6", required: true }],
  allowExtraWires: false,
  maxExtraWires: 2
};

export async function up(db: Kysely<Database>): Promise<void> {
  await db.schema
    .alterTable("sensor_catalog")
    .addColumn("sensor_type", "text")
    .addColumn("model", "text")
    .execute();

  await sql`TRUNCATE TABLE measurements`.execute(db);
  await sql`DELETE FROM alerts`.execute(db);
  await sql`DELETE FROM sensor_catalog`.execute(db);

  await db.schema
    .alterTable("sensor_catalog")
    .alterColumn("sensor_type", (col) => col.setNotNull())
    .alterColumn("model", (col) => col.setNotNull())
    .execute();

  for (const row of DEFAULT_SENSOR_CATALOG_ROWS) {
    await db
      .insertInto("sensor_catalog")
      .values({
        key: row.key,
        sensor_type: row.sensor_type,
        model: row.model,
        display_name: row.display_name,
        unit: row.unit,
        physical_min: row.physical_min,
        physical_max: row.physical_max,
        sort_order: row.sort_order,
        icon: row.icon,
        wiring_template: GENERIC_WIRING
      })
      .execute();
  }

  const sites = await db.selectFrom("sites").select("id").execute();
  for (const site of sites) {
    for (const row of DEFAULT_SENSOR_CATALOG_ROWS) {
      await sql`
        INSERT INTO site_sensor_catalog (site_id, sensor, enabled, updated_at)
        VALUES (${site.id}, ${row.key}, false, now())
        ON CONFLICT DO NOTHING
      `.execute(db);
    }
  }
}

export async function down(db: Kysely<Database>): Promise<void> {
  await sql`TRUNCATE TABLE measurements`.execute(db);
  await sql`DELETE FROM alerts`.execute(db);
  await sql`DELETE FROM sensor_catalog`.execute(db);

  await db.schema
    .alterTable("sensor_catalog")
    .dropColumn("sensor_type")
    .dropColumn("model")
    .execute();

  await sql`
    INSERT INTO sensor_catalog (key, display_name, unit, physical_min, physical_max, sort_order, wiring_template)
    VALUES
      ('temperature', 'Temperature', '°C', -40, 60, 1, '{"wires":[{"id":"signal","label":"Signal","color":"#3b82f6","required":true}],"allowExtraWires":false,"maxExtraWires":2}'::jsonb),
      ('ph', 'pH', 'pH', 0, 14, 2, '{"wires":[{"id":"signal","label":"Signal","color":"#22c55e","required":true}],"allowExtraWires":false,"maxExtraWires":2}'::jsonb),
      ('waterLevel', 'Water level', '%', 0, 100, 3, '{"wires":[{"id":"signal","label":"Signal","color":"#eab308","required":true}],"allowExtraWires":false,"maxExtraWires":2}'::jsonb),
      ('waterFlow', 'Water flow', 'L/min', 0, 500, 4, '{"wires":[{"id":"signal","label":"Signal","color":"#a855f7","required":true}],"allowExtraWires":false,"maxExtraWires":2}'::jsonb)
  `.execute(db);
}

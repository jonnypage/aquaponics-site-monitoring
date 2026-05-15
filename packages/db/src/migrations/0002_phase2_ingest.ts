import { Kysely, sql } from "kysely";
import type { Database } from "../types.js";

export async function up(db: Kysely<Database>): Promise<void> {
  await db.schema
    .createTable("sensor_catalog")
    .addColumn("key", "text", (col) => col.primaryKey())
    .addColumn("display_name", "text", (col) => col.notNull())
    .addColumn("unit", "text", (col) => col.notNull())
    .addColumn("physical_min", "double precision")
    .addColumn("physical_max", "double precision")
    .addColumn("sort_order", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("icon", "text")
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createTable("devices")
    .addColumn("device_id", "text", (col) => col.primaryKey())
    .addColumn("api_key_hash", "text", (col) => col.notNull())
    .addColumn("site_id", "uuid", (col) =>
      col.notNull().references("sites.id").onDelete("cascade")
    )
    .addColumn("last_seen_at", "timestamptz")
    .addColumn("expected_interval_seconds", "integer", (col) => col.notNull().defaultTo(300))
    .addColumn("report_interval_seconds", "integer", (col) => col.notNull().defaultTo(300))
    .addColumn("snapshot_interval_seconds", "integer", (col) => col.notNull().defaultTo(900))
    .addColumn("has_camera", "boolean", (col) => col.notNull().defaultTo(false))
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createTable("measurements")
    .addColumn("taken_at", "timestamptz", (col) => col.notNull())
    .addColumn("id", "uuid", (col) => col.notNull().defaultTo(sql`gen_random_uuid()`))
    .addColumn("site_id", "uuid", (col) =>
      col.notNull().references("sites.id").onDelete("cascade")
    )
    .addColumn("device_id", "text", (col) => col.references("devices.device_id").onDelete("set null"))
    .addColumn("sensor", "text", (col) => col.notNull())
    .addColumn("value", "double precision", (col) => col.notNull())
    .addColumn("ingested_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .addPrimaryKeyConstraint("measurements_pkey", ["taken_at", "id"])
    .execute();

  await sql`
    CREATE INDEX measurements_site_sensor_taken_desc_idx
    ON measurements (site_id, sensor, taken_at DESC)
  `.execute(db);

  await sql`
    CREATE INDEX measurements_device_taken_desc_idx
    ON measurements (device_id, taken_at DESC)
  `.execute(db);

  await sql`
    INSERT INTO sensor_catalog (key, display_name, unit, physical_min, physical_max, sort_order)
    VALUES
      ('temperature', 'Temperature', '°C', -40, 60, 1),
      ('ph', 'pH', 'pH', 0, 14, 2),
      ('waterLevel', 'Water level', '%', 0, 100, 3),
      ('waterFlow', 'Water flow', 'L/min', 0, 500, 4)
    ON CONFLICT (key) DO NOTHING
  `.execute(db);
}

export async function down(db: Kysely<Database>): Promise<void> {
  await sql`DROP INDEX IF EXISTS measurements_device_taken_desc_idx`.execute(db);
  await sql`DROP INDEX IF EXISTS measurements_site_sensor_taken_desc_idx`.execute(db);
  await db.schema.dropTable("measurements").ifExists().execute();
  await db.schema.dropTable("devices").ifExists().execute();
  await db.schema.dropTable("sensor_catalog").ifExists().execute();
}

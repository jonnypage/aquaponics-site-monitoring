import { Kysely, sql } from "kysely";
import type { Database } from "../types.js";

export async function up(db: Kysely<Database>): Promise<void> {
  await db.schema
    .createTable("site_sensor_catalog")
    .addColumn("site_id", "uuid", (col) => col.notNull().references("sites.id").onDelete("cascade"))
    .addColumn("sensor", "text", (col) =>
      col.notNull().references("sensor_catalog.key").onDelete("cascade")
    )
    .addColumn("enabled", "boolean", (col) => col.notNull().defaultTo(true))
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .addPrimaryKeyConstraint("site_sensor_catalog_pkey", ["site_id", "sensor"])
    .execute();

  await db.schema
    .createTable("sensor_thresholds")
    .addColumn("site_id", "uuid", (col) => col.notNull().references("sites.id").onDelete("cascade"))
    .addColumn("sensor", "text", (col) =>
      col.notNull().references("sensor_catalog.key").onDelete("cascade")
    )
    .addColumn("normal_min", "double precision")
    .addColumn("normal_max", "double precision")
    .addColumn("warning_delta", "double precision")
    .addColumn("critical_delta", "double precision")
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .addPrimaryKeyConstraint("sensor_thresholds_pkey", ["site_id", "sensor"])
    .execute();

  await db.schema
    .createTable("alerts")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("site_id", "uuid", (col) => col.notNull().references("sites.id").onDelete("cascade"))
    .addColumn("device_id", "text", (col) => col.references("devices.device_id").onDelete("set null"))
    .addColumn("type", "text", (col) => col.notNull())
    .addColumn("severity", "text", (col) => col.notNull())
    .addColumn("status", "text", (col) => col.notNull())
    .addColumn("message", "text", (col) => col.notNull())
    .addColumn("last_notified_at", "timestamptz")
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await sql`
    CREATE UNIQUE INDEX alerts_one_active_per_site_type
    ON alerts (site_id, type)
    WHERE (status = 'active')
  `.execute(db);

  await sql`
    CREATE INDEX alerts_site_status_idx ON alerts (site_id, status)
  `.execute(db);

  await sql`
    CREATE INDEX alerts_status_severity_idx ON alerts (status, severity)
    WHERE (status = 'active')
  `.execute(db);
}

export async function down(db: Kysely<Database>): Promise<void> {
  await sql`DROP INDEX IF EXISTS alerts_status_severity_idx`.execute(db);
  await sql`DROP INDEX IF EXISTS alerts_site_status_idx`.execute(db);
  await sql`DROP INDEX IF EXISTS alerts_one_active_per_site_type`.execute(db);
  await db.schema.dropTable("alerts").ifExists().execute();
  await db.schema.dropTable("sensor_thresholds").ifExists().execute();
  await db.schema.dropTable("site_sensor_catalog").ifExists().execute();
}

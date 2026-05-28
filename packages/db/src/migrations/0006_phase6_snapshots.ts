import { Kysely, sql } from "kysely";
import type { Database } from "../types.js";

export async function up(db: Kysely<Database>): Promise<void> {
  await db.schema
    .alterTable("devices")
    .addColumn("name", "text")
    .addColumn("board", "text")
    .addColumn("pin_map", "jsonb")
    .execute();

  await db.schema
    .createTable("device_snapshots")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("device_id", "text", (col) =>
      col.notNull().references("devices.device_id").onDelete("cascade")
    )
    .addColumn("site_id", "uuid", (col) =>
      col.notNull().references("sites.id").onDelete("cascade")
    )
    .addColumn("taken_at", "timestamptz", (col) => col.notNull())
    .addColumn("ingested_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn("content_type", "text", (col) => col.notNull())
    .addColumn("byte_size", "integer", (col) => col.notNull())
    .addColumn("storage_bucket", "text", (col) => col.notNull())
    .addColumn("storage_key", "text", (col) => col.notNull())
    .execute();

  await sql`
    CREATE INDEX device_snapshots_site_taken_desc_idx
    ON device_snapshots (site_id, taken_at DESC)
  `.execute(db);

  await sql`
    CREATE INDEX device_snapshots_device_taken_desc_idx
    ON device_snapshots (device_id, taken_at DESC)
  `.execute(db);
}

export async function down(db: Kysely<Database>): Promise<void> {
  await sql`DROP INDEX IF EXISTS device_snapshots_device_taken_desc_idx`.execute(db);
  await sql`DROP INDEX IF EXISTS device_snapshots_site_taken_desc_idx`.execute(db);
  await db.schema.dropTable("device_snapshots").ifExists().execute();
  await db.schema
    .alterTable("devices")
    .dropColumn("pin_map")
    .dropColumn("board")
    .dropColumn("name")
    .execute();
}

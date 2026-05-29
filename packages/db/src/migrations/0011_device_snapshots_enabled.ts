import { Kysely, sql } from "kysely";
import type { Database } from "../types.js";

export async function up(db: Kysely<Database>): Promise<void> {
  await db.schema
    .alterTable("devices")
    .addColumn("snapshots_enabled", "boolean", (col) => col.notNull().defaultTo(false))
    .execute();

  await sql`
    UPDATE devices
    SET snapshots_enabled = has_camera
    WHERE has_camera = true
  `.execute(db);
}

export async function down(db: Kysely<Database>): Promise<void> {
  await db.schema.alterTable("devices").dropColumn("snapshots_enabled").execute();
}

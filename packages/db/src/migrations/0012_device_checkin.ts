import { Kysely, sql } from "kysely";
import type { Database } from "../types.js";

export async function up(db: Kysely<Database>): Promise<void> {
  await db.schema
    .alterTable("devices")
    .addColumn("checkin_interval_seconds", "integer", (col) => col.notNull().defaultTo(300))
    .addColumn("telemetry_requested_at", "timestamptz")
    .addColumn("snapshot_requested_at", "timestamptz")
    .execute();
}

export async function down(db: Kysely<Database>): Promise<void> {
  await db.schema
    .alterTable("devices")
    .dropColumn("snapshot_requested_at")
    .dropColumn("telemetry_requested_at")
    .dropColumn("checkin_interval_seconds")
    .execute();
}

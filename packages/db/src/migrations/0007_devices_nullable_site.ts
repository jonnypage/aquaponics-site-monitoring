import { Kysely } from "kysely";
import type { Database } from "../types.js";

export async function up(db: Kysely<Database>): Promise<void> {
  await db.schema
    .alterTable("devices")
    .alterColumn("site_id", (col) => col.dropNotNull())
    .execute();
}

export async function down(db: Kysely<Database>): Promise<void> {
  await db.schema
    .alterTable("devices")
    .alterColumn("site_id", (col) => col.setNotNull())
    .execute();
}

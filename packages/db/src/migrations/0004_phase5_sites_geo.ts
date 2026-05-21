import { Kysely } from "kysely";
import type { Database } from "../types.js";

export async function up(db: Kysely<Database>): Promise<void> {
  await db.schema
    .alterTable("sites")
    .addColumn("latitude", "double precision")
    .addColumn("longitude", "double precision")
    .execute();
}

export async function down(db: Kysely<Database>): Promise<void> {
  await db.schema.alterTable("sites").dropColumn("latitude").dropColumn("longitude").execute();
}

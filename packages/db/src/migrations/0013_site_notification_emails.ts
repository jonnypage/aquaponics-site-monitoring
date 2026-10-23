import { Kysely, sql } from "kysely";
import type { Database } from "../types.js";

export async function up(db: Kysely<Database>): Promise<void> {
  await sql`
    ALTER TABLE sites
    ADD COLUMN notification_emails text[] NOT NULL DEFAULT '{}'::text[]
  `.execute(db);
}

export async function down(db: Kysely<Database>): Promise<void> {
  await db.schema.alterTable("sites").dropColumn("notification_emails").execute();
}

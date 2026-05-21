import { Kysely, sql } from "kysely";
import type { Database } from "../types.js";

/** Lucide React export names (PascalCase), see https://lucide.dev/icons */
export async function up(db: Kysely<Database>): Promise<void> {
  await sql`
    UPDATE sensor_catalog SET icon = 'Thermometer', updated_at = now() WHERE key = 'temperature'
  `.execute(db);
  await sql`
    UPDATE sensor_catalog SET icon = 'FlaskConical', updated_at = now() WHERE key = 'ph'
  `.execute(db);
  await sql`
    UPDATE sensor_catalog SET icon = 'Gauge', updated_at = now() WHERE key = 'waterLevel'
  `.execute(db);
  await sql`
    UPDATE sensor_catalog SET icon = 'Waves', updated_at = now() WHERE key = 'waterFlow'
  `.execute(db);
}

export async function down(_db: Kysely<Database>): Promise<void> {
  // Non-destructive: leave admin-set icons in place
}

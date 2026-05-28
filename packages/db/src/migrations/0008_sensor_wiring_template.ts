import { Kysely, sql } from "kysely";
import type { Database } from "../types.js";
import type { SensorWiringTemplate } from "../sensor-wiring.js";

const MVP_WIRING: Record<string, SensorWiringTemplate> = {
  temperature: {
    wires: [{ id: "signal", label: "Signal", color: "#3b82f6", required: true }],
    allowExtraWires: false,
    maxExtraWires: 2
  },
  ph: {
    wires: [{ id: "signal", label: "Signal", color: "#22c55e", required: true }],
    allowExtraWires: false,
    maxExtraWires: 2
  },
  waterLevel: {
    wires: [{ id: "signal", label: "Signal", color: "#eab308", required: true }],
    allowExtraWires: false,
    maxExtraWires: 2
  },
  waterFlow: {
    wires: [{ id: "signal", label: "Signal", color: "#a855f7", required: true }],
    allowExtraWires: false,
    maxExtraWires: 2
  }
};

export async function up(db: Kysely<Database>): Promise<void> {
  await db.schema
    .alterTable("sensor_catalog")
    .addColumn("wiring_template", "jsonb", (col) =>
      col.notNull().defaultTo(
        sql`'{"wires":[{"id":"signal","label":"Signal","color":"#3b82f6","required":true}],"allowExtraWires":false,"maxExtraWires":2}'::jsonb`
      )
    )
    .execute();

  for (const [key, template] of Object.entries(MVP_WIRING)) {
    await db
      .updateTable("sensor_catalog")
      .set({ wiring_template: template, updated_at: new Date() })
      .where("key", "=", key)
      .execute();
  }
}

export async function down(db: Kysely<Database>): Promise<void> {
  await db.schema.alterTable("sensor_catalog").dropColumn("wiring_template").execute();
}

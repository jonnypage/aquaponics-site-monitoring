import "dotenv/config";
import { createHash } from "node:crypto";
import type { Kysely } from "kysely";
import type { Database } from "../types.js";
import type { DevicePinMap } from "../sensor-wiring.js";
import { getDb } from "./shared.js";
import {
  DEFAULT_SITE_NAME,
  SEED_DEVICE_API_KEY,
  SEED_DEVICE_ID,
  VIEWER_EMAIL
} from "./seed-constants.js";

export async function seedDemo(db: Kysely<Database>): Promise<void> {
  const site = await db
    .insertInto("sites")
    .values({ name: DEFAULT_SITE_NAME })
    .onConflict((oc) => oc.column("name").doUpdateSet({ name: DEFAULT_SITE_NAME }))
    .returning(["id", "name"])
    .executeTakeFirstOrThrow();

  const viewer = await db
    .selectFrom("users")
    .select(["id"])
    .where("email", "=", VIEWER_EMAIL)
    .executeTakeFirst();

  if (viewer) {
    await db
      .insertInto("user_sites")
      .values({
        user_id: viewer.id,
        site_id: site.id
      })
      .onConflict((oc) => oc.columns(["user_id", "site_id"]).doNothing())
      .execute();
  }

  const deviceApiKeyHash = createHash("sha256").update(SEED_DEVICE_API_KEY, "utf8").digest("hex");
  await db
    .insertInto("devices")
    .values({
      device_id: SEED_DEVICE_ID,
      api_key_hash: deviceApiKeyHash,
      site_id: site.id,
      expected_interval_seconds: 300,
      report_interval_seconds: 300,
      snapshot_interval_seconds: 900,
      has_camera: false
    })
    .onConflict((oc) =>
      oc.column("device_id").doUpdateSet({
        api_key_hash: deviceApiKeyHash,
        site_id: site.id,
        expected_interval_seconds: 300,
        report_interval_seconds: 300,
        snapshot_interval_seconds: 900,
        has_camera: false,
        updated_at: new Date()
      })
    )
    .execute();

  const sensors = await db.selectFrom("sensor_catalog").select("key").execute();
  const pinMap: DevicePinMap = Object.fromEntries(sensors.map(({ key }) => [key, { signal: 1 }]));
  await db
    .updateTable("devices")
    .set({ pin_map: pinMap, updated_at: new Date() })
    .where("device_id", "=", SEED_DEVICE_ID)
    .execute();

  for (const { key } of sensors) {
    await db
      .insertInto("site_sensor_catalog")
      .values({
        site_id: site.id,
        device_id: SEED_DEVICE_ID,
        sensor: key,
        enabled: true
      })
      .onConflict((oc) => oc.columns(["site_id", "device_id", "sensor"]).doNothing())
      .execute();
  }

  console.log("Seed demo data complete");
  console.log(`Site: ${site.name}`);
  console.log(`Device ingest: deviceId=${SEED_DEVICE_ID}  x-api-key=${SEED_DEVICE_API_KEY}`);
  if (!viewer) {
    console.log(`Note: run pnpm seed:users to create ${VIEWER_EMAIL} and assign site access`);
  }
}

async function main(): Promise<void> {
  const db = getDb();
  try {
    await seedDemo(db);
  } finally {
    await db.destroy();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

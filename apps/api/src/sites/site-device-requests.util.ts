import type { Database } from "@aquaponics/db";
import type { Kysely } from "kysely";
import { isPendingDeviceRequest } from "../ingest/device-request.util.js";

export async function siteTelemetryRefreshPending(
  db: Kysely<Database>,
  siteId: string,
  nowMs: number = Date.now()
): Promise<boolean> {
  const rows = await db
    .selectFrom("devices")
    .select(["telemetry_requested_at"])
    .where("site_id", "=", siteId)
    .execute();

  return rows.some((row) => isPendingDeviceRequest(row.telemetry_requested_at, nowMs));
}

export async function requestSiteDeviceTelemetry(
  db: Kysely<Database>,
  siteId: string
): Promise<number> {
  const now = new Date();
  const result = await db
    .updateTable("devices")
    .set({ telemetry_requested_at: now, updated_at: now })
    .where("site_id", "=", siteId)
    .executeTakeFirst();

  return Number(result.numUpdatedRows ?? 0);
}

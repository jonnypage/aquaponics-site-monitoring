import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import type { Database } from "@aquaponics/db";
import type { Kysely } from "kysely";
import { ZodError } from "zod";
import { DB_TOKEN } from "../database/database.constants.js";
import { IngestAlertService } from "./ingest-alert.service.js";
import { authenticateDeviceByApiKey } from "./device-auth.util.js";
import { buildDeviceCommands, type DeviceCommandEnvelope } from "./device-commands.util.js";
import { isExpiredDeviceRequest } from "./device-request.util.js";
import { checkinBodySchema } from "./checkin.schema.js";
import { requireDeviceSiteId } from "./device-site.util.js";
import { IngestRateLimiter } from "./ingest-rate-limiter.service.js";

export interface CheckinSuccessResponse {
  ok: true;
  commands: DeviceCommandEnvelope;
}

@Injectable()
export class CheckinService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Kysely<Database>,
    private readonly rateLimiter: IngestRateLimiter,
    private readonly ingestAlerts: IngestAlertService
  ) {}

  async handleCheckin(apiKeyHeader: string | undefined, body: unknown): Promise<CheckinSuccessResponse> {
    let parsed: ReturnType<typeof checkinBodySchema.parse>;
    try {
      parsed = checkinBodySchema.parse(body);
    } catch (e) {
      if (e instanceof ZodError) {
        const msg = e.issues.map((it) => it.message).join("; ");
        throw new BadRequestException(msg || "Invalid request body");
      }
      throw e;
    }

    const device = await authenticateDeviceByApiKey(this.db, apiKeyHeader, parsed.deviceId);
    const siteId = requireDeviceSiteId(device);

    this.rateLimiter.assertAllowed(`${device.device_id}:checkin`, device.checkin_interval_seconds);

    const seenAt = new Date(parsed.timestamp);
    const now = new Date();

    try {
      await this.db.transaction().execute(async (trx) => {
        const patch: {
          last_seen_at: Date;
          updated_at: Date;
          telemetry_requested_at?: null;
          snapshot_requested_at?: null;
        } = {
          last_seen_at: seenAt,
          updated_at: now
        };

        if (isExpiredDeviceRequest(device.telemetry_requested_at, now.getTime())) {
          patch.telemetry_requested_at = null;
        }
        if (isExpiredDeviceRequest(device.snapshot_requested_at, now.getTime())) {
          patch.snapshot_requested_at = null;
        }

        await trx.updateTable("devices").set(patch).where("device_id", "=", device.device_id).execute();
        await this.ingestAlerts.syncDeviceOfflineStateForSite(trx, siteId, now.getTime());
      });
    } catch (e) {
      this.rateLimiter.rollbackLast(`${device.device_id}:checkin`);
      throw e;
    }

    const refreshed = await this.db
      .selectFrom("devices")
      .selectAll()
      .where("device_id", "=", device.device_id)
      .executeTakeFirstOrThrow();

    const siteHasActiveAlert = await this.ingestAlerts.siteHasAnyActiveAlert(siteId);

    return {
      ok: true,
      commands: buildDeviceCommands(refreshed, siteHasActiveAlert, now.getTime())
    };
  }
}

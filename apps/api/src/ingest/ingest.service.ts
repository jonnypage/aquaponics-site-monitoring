import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import type { Database } from "@aquaponics/db";
import type { Kysely } from "kysely";
import { ZodError } from "zod";
import { DB_TOKEN } from "../database/database.constants.js";
import { IngestAlertService } from "./ingest-alert.service.js";
import { ingestBodySchema } from "./ingest.schema.js";
import { requireDeviceSiteId } from "./device-site.util.js";
import { IngestRateLimiter } from "./ingest-rate-limiter.service.js";
import { authenticateDeviceByApiKey } from "./device-auth.util.js";
import { buildDeviceCommands, type DeviceCommandEnvelope } from "./device-commands.util.js";
import {
  hasPendingTelemetryRequest,
  shouldClearTelemetryRequest
} from "./device-request-fulfillment.util.js";

export interface IngestSuccessResponse {
  ok: true;
  inserted: number;
  commands: DeviceCommandEnvelope;
}

@Injectable()
export class IngestService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Kysely<Database>,
    private readonly rateLimiter: IngestRateLimiter,
    private readonly ingestAlerts: IngestAlertService
  ) {}

  async handleIngest(apiKeyHeader: string | undefined, body: unknown): Promise<IngestSuccessResponse> {
    let parsed: ReturnType<typeof ingestBodySchema.parse>;
    try {
      parsed = ingestBodySchema.parse(body);
    } catch (e) {
      if (e instanceof ZodError) {
        const msg = e.issues.map((it) => it.message).join("; ");
        throw new BadRequestException(msg || "Invalid request body");
      }
      throw e;
    }

    const device = await authenticateDeviceByApiKey(this.db, apiKeyHeader, parsed.deviceId);
    const siteId = requireDeviceSiteId(device);

    const catalogRows = await this.db.selectFrom("sensor_catalog").select("key").execute();
    const allowedKeys = new Set(catalogRows.map((r) => r.key));

    const sensorKeys = Object.keys(parsed.readings);
    for (const sensorKey of sensorKeys) {
      if (!allowedKeys.has(sensorKey)) {
        throw new BadRequestException(`Unknown sensor key: ${sensorKey}`);
      }
    }

    const catalogByKey = await this.db
      .selectFrom("sensor_catalog")
      .selectAll()
      .where("key", "in", sensorKeys)
      .execute()
      .then((rows) => new Map(rows.map((r) => [r.key, r])));

    const siteSensors = await this.db
      .selectFrom("site_sensor_catalog")
      .selectAll()
      .where("site_id", "=", siteId)
      .where("device_id", "=", device.device_id)
      .where("sensor", "in", sensorKeys)
      .execute();
    const enabledBySensor = new Map(siteSensors.map((s) => [s.sensor, s.enabled]));

    const thresholds = await this.db
      .selectFrom("sensor_thresholds")
      .selectAll()
      .where("site_id", "=", siteId)
      .where("device_id", "=", device.device_id)
      .where("sensor", "in", sensorKeys)
      .execute();
    const thresholdBySensor = new Map(thresholds.map((t) => [t.sensor, t]));

    const takenAt = new Date(parsed.timestamp);
    const nowMs = Date.now();
    const clearTelemetryRequest = shouldClearTelemetryRequest(device, takenAt, nowMs);

    if (!hasPendingTelemetryRequest(device, nowMs)) {
      this.rateLimiter.assertAllowed(device.device_id, device.expected_interval_seconds);
    }

    const rows = Object.entries(parsed.readings).map(([sensor, value]) => ({
      taken_at: takenAt,
      site_id: siteId,
      device_id: device.device_id,
      sensor,
      value: value as number
    }));

    try {
      await this.db.transaction().execute(async (trx) => {
        await trx.insertInto("measurements").values(rows).execute();

        const devicePatch: {
          last_seen_at: Date;
          updated_at: Date;
          telemetry_requested_at?: null;
        } = {
          last_seen_at: takenAt,
          updated_at: new Date()
        };
        if (clearTelemetryRequest) {
          devicePatch.telemetry_requested_at = null;
        }

        await trx
          .updateTable("devices")
          .set(devicePatch)
          .where("device_id", "=", device.device_id)
          .execute();

        for (const row of rows) {
          const cat = catalogByKey.get(row.sensor);
          if (!cat) {
            continue;
          }
          const sensorEnabled = enabledBySensor.get(row.sensor) === true;
          const th = thresholdBySensor.get(row.sensor);
          await this.ingestAlerts.syncRangeAlertForReading(trx, {
            siteId,
            deviceId: device.device_id,
            sensorKey: row.sensor,
            value: row.value,
            physicalMin: cat.physical_min,
            physicalMax: cat.physical_max,
            threshold: th
              ? {
                  normal_min: th.normal_min,
                  normal_max: th.normal_max,
                  warning_delta: th.warning_delta,
                  critical_delta: th.critical_delta
                }
              : undefined,
            sensorEnabled
          });

          const histRows = await trx
            .selectFrom("measurements")
            .select(["value", "taken_at"])
            .where("site_id", "=", siteId)
            .where("device_id", "=", device.device_id)
            .where("sensor", "=", row.sensor)
            .where("taken_at", "<=", takenAt)
            .orderBy("taken_at", "desc")
            .orderBy("id", "desc")
            .limit(40)
            .execute();

          const historyNewestFirst = histRows.map((h) => ({
            value: h.value,
            takenAt: new Date(h.taken_at as Date | string)
          }));

          await this.ingestAlerts.syncHeuristicAlertsForReading(trx, {
            siteId,
            deviceId: device.device_id,
            sensorType: cat.sensor_type,
            takenAt,
            sensorEnabled,
            historyNewestFirst
          });
        }

        await this.ingestAlerts.syncDeviceOfflineStateForSite(trx, siteId);
      });
    } catch (e) {
      if (!hasPendingTelemetryRequest(device, nowMs)) {
        this.rateLimiter.rollbackLast(device.device_id);
      }
      throw e;
    }

    const siteHasActiveAlert = await this.ingestAlerts.siteHasAnyActiveAlert(siteId);

    const refreshed = await this.db
      .selectFrom("devices")
      .selectAll()
      .where("device_id", "=", device.device_id)
      .executeTakeFirstOrThrow();

    return {
      ok: true,
      inserted: rows.length,
      commands: buildDeviceCommands(refreshed, siteHasActiveAlert, nowMs)
    };
  }
}

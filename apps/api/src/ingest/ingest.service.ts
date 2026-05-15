import { createHash } from "node:crypto";
import { BadRequestException, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import type { Database } from "@aquaponics/db";
import type { Kysely } from "kysely";
import { ZodError } from "zod";
import { DB_TOKEN } from "../database/database.constants.js";
import { IngestAlertService } from "./ingest-alert.service.js";
import { ingestBodySchema } from "./ingest.schema.js";
import { IngestRateLimiter } from "./ingest-rate-limiter.service.js";

function sha256Hex(plaintext: string): string {
  return createHash("sha256").update(plaintext, "utf8").digest("hex");
}

export interface IngestSuccessResponse {
  ok: true;
  inserted: number;
  commands: {
    reportIntervalSeconds: number;
    snapshotIntervalSeconds: number;
    captureImageNow: boolean;
  };
}

@Injectable()
export class IngestService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Kysely<Database>,
    private readonly rateLimiter: IngestRateLimiter,
    private readonly ingestAlerts: IngestAlertService
  ) {}

  async handleIngest(apiKeyHeader: string | undefined, body: unknown): Promise<IngestSuccessResponse> {
    if (apiKeyHeader === undefined || apiKeyHeader.trim() === "") {
      throw new UnauthorizedException("Missing x-api-key header");
    }

    const apiKey = apiKeyHeader.trim();

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

    const keyHash = sha256Hex(apiKey);

    const device = await this.db
      .selectFrom("devices")
      .selectAll()
      .where("device_id", "=", parsed.deviceId)
      .executeTakeFirst();

    if (!device || device.api_key_hash !== keyHash) {
      throw new UnauthorizedException("Invalid API key or device");
    }

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
      .where("site_id", "=", device.site_id)
      .where("sensor", "in", sensorKeys)
      .execute();
    const enabledBySensor = new Map(siteSensors.map((s) => [s.sensor, s.enabled]));

    const thresholds = await this.db
      .selectFrom("sensor_thresholds")
      .selectAll()
      .where("site_id", "=", device.site_id)
      .where("sensor", "in", sensorKeys)
      .execute();
    const thresholdBySensor = new Map(thresholds.map((t) => [t.sensor, t]));

    const takenAt = new Date(parsed.timestamp);
    const rows = Object.entries(parsed.readings).map(([sensor, value]) => ({
      taken_at: takenAt,
      site_id: device.site_id,
      device_id: device.device_id,
      sensor,
      value: value as number
    }));

    this.rateLimiter.assertAllowed(device.device_id, device.expected_interval_seconds);

    try {
      await this.db.transaction().execute(async (trx) => {
        await trx.insertInto("measurements").values(rows).execute();
        await trx
          .updateTable("devices")
          .set({
            last_seen_at: takenAt,
            updated_at: new Date()
          })
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
            siteId: device.site_id,
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
            .where("site_id", "=", device.site_id)
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
            siteId: device.site_id,
            deviceId: device.device_id,
            sensorKey: row.sensor,
            takenAt,
            sensorEnabled,
            historyNewestFirst
          });
        }

        await this.ingestAlerts.syncDeviceOfflineStateForSite(trx, device.site_id);
      });
    } catch (e) {
      this.rateLimiter.rollbackLast(device.device_id);
      throw e;
    }

    const captureImageNow = await this.ingestAlerts.siteHasAnyActiveAlert(device.site_id);

    return {
      ok: true,
      inserted: rows.length,
      commands: {
        reportIntervalSeconds: device.report_interval_seconds,
        snapshotIntervalSeconds: device.snapshot_interval_seconds,
        captureImageNow
      }
    };
  }
}

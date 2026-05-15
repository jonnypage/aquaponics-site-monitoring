import { createHash } from "node:crypto";
import { BadRequestException, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import type { Database } from "@aquaponics/db";
import type { Kysely } from "kysely";
import { ZodError } from "zod";
import { DB_TOKEN } from "../database/database.constants.js";
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
    private readonly rateLimiter: IngestRateLimiter
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

    for (const sensorKey of Object.keys(parsed.readings)) {
      if (!allowedKeys.has(sensorKey)) {
        throw new BadRequestException(`Unknown sensor key: ${sensorKey}`);
      }
    }

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
      });
    } catch (e) {
      this.rateLimiter.rollbackLast(device.device_id);
      throw e;
    }

    return {
      ok: true,
      inserted: rows.length,
      commands: {
        reportIntervalSeconds: device.report_interval_seconds,
        snapshotIntervalSeconds: device.snapshot_interval_seconds,
        captureImageNow: false
      }
    };
  }
}

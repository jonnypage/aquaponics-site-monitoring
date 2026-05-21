import { createHash } from "node:crypto";
import {
  BadRequestException,
  Inject,
  Injectable,
  PayloadTooLargeException,
  ServiceUnavailableException,
  UnauthorizedException
} from "@nestjs/common";
import type { Database } from "@aquaponics/db";
import type { Kysely } from "kysely";
import { ZodError } from "zod";
import { DB_TOKEN } from "../database/database.constants.js";
import { StorageService } from "../storage/storage.service.js";
import {
  ingestSnapshotMetadataSchema,
  SNAPSHOT_MAX_BYTES
} from "./ingest-snapshot.schema.js";
import { requireDeviceSiteId } from "./device-site.util.js";
import { IngestRateLimiter } from "./ingest-rate-limiter.service.js";

function sha256Hex(plaintext: string): string {
  return createHash("sha256").update(plaintext, "utf8").digest("hex");
}

export interface IngestSnapshotSuccessResponse {
  ok: true;
}

@Injectable()
export class IngestSnapshotService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Kysely<Database>,
    private readonly rateLimiter: IngestRateLimiter,
    private readonly storage: StorageService
  ) {}

  async handleSnapshotIngest(
    apiKeyHeader: string | undefined,
    metadataRaw: string | undefined,
    imageBuffer: Buffer | undefined,
    imageMime: string | undefined
  ): Promise<IngestSnapshotSuccessResponse> {
    if (!this.storage.isConfigured()) {
      throw new ServiceUnavailableException("Object storage is not configured");
    }

    if (apiKeyHeader === undefined || apiKeyHeader.trim() === "") {
      throw new UnauthorizedException("Missing x-api-key header");
    }

    if (metadataRaw === undefined || metadataRaw.trim() === "") {
      throw new BadRequestException("Missing metadata part");
    }

    if (imageBuffer === undefined || imageBuffer.length === 0) {
      throw new BadRequestException("Missing image part");
    }

    if (imageBuffer.length > SNAPSHOT_MAX_BYTES) {
      throw new PayloadTooLargeException("Image exceeds 5 MB limit");
    }

    const mime = (imageMime ?? "").toLowerCase();
    if (mime !== "image/jpeg") {
      throw new BadRequestException("image must be image/jpeg");
    }

    let parsed: ReturnType<typeof ingestSnapshotMetadataSchema.parse>;
    try {
      const json = JSON.parse(metadataRaw) as unknown;
      parsed = ingestSnapshotMetadataSchema.parse(json);
    } catch (e) {
      if (e instanceof ZodError) {
        const msg = e.issues.map((it) => it.message).join("; ");
        throw new BadRequestException(msg || "Invalid metadata JSON");
      }
      throw new BadRequestException("Invalid metadata JSON");
    }

    const apiKey = apiKeyHeader.trim();
    const keyHash = sha256Hex(apiKey);

    const device = await this.db
      .selectFrom("devices")
      .selectAll()
      .where("device_id", "=", parsed.deviceId)
      .executeTakeFirst();

    if (!device || device.api_key_hash !== keyHash) {
      throw new UnauthorizedException("Invalid API key or device");
    }

    const siteId = requireDeviceSiteId(device);

    const takenAt = new Date(parsed.timestamp);
    const ingestedAt = new Date();

    this.rateLimiter.assertAllowed(device.device_id, device.expected_interval_seconds);

    const storageKey = this.storage.buildSnapshotKey(siteId, device.device_id, takenAt);
    const bucket = this.storage.getBucketName();

    try {
      await this.storage.putSnapshot(storageKey, imageBuffer, "image/jpeg");

      await this.db.transaction().execute(async (trx) => {
        await trx
          .insertInto("device_snapshots")
          .values({
            device_id: device.device_id,
            site_id: siteId,
            taken_at: takenAt,
            ingested_at: ingestedAt,
            content_type: "image/jpeg",
            byte_size: imageBuffer.length,
            storage_bucket: bucket,
            storage_key: storageKey
          })
          .execute();

        await trx
          .updateTable("devices")
          .set({
            last_seen_at: ingestedAt,
            updated_at: ingestedAt
          })
          .where("device_id", "=", device.device_id)
          .execute();
      });
    } catch (e) {
      this.rateLimiter.rollbackLast(device.device_id);
      throw e;
    }

    return { ok: true };
  }
}

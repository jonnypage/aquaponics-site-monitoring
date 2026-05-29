import { BadRequestException, Inject, Injectable, PayloadTooLargeException, ServiceUnavailableException } from "@nestjs/common";
import type { Database } from "@aquaponics/db";
import type { Kysely } from "kysely";
import { ZodError } from "zod";
import { DB_TOKEN } from "../database/database.constants.js";
import { StorageService } from "../storage/storage.service.js";
import { authenticateDeviceByApiKey } from "./device-auth.util.js";
import {
  hasPendingSnapshotRequest,
  shouldClearSnapshotRequest
} from "./device-request-fulfillment.util.js";
import {
  ingestSnapshotMetadataSchema,
  SNAPSHOT_MAX_BYTES
} from "./ingest-snapshot.schema.js";
import { requireDeviceSiteId } from "./device-site.util.js";
import { IngestRateLimiter } from "./ingest-rate-limiter.service.js";

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

    const device = await authenticateDeviceByApiKey(this.db, apiKeyHeader, parsed.deviceId);
    const siteId = requireDeviceSiteId(device);

    if (!device.has_camera) {
      throw new BadRequestException("Device is not configured with a camera");
    }

    if (!device.snapshots_enabled) {
      throw new BadRequestException("Camera snapshots are disabled for this device at the site");
    }

    const takenAt = new Date(parsed.timestamp);
    const ingestedAt = new Date();
    const nowMs = ingestedAt.getTime();
    const rateLimitKey = `${device.device_id}:snapshot`;

    if (!hasPendingSnapshotRequest(device, nowMs)) {
      this.rateLimiter.assertAllowed(rateLimitKey, device.snapshot_interval_seconds);
    }

    const storageKey = this.storage.buildSnapshotKey(siteId, device.device_id, takenAt);
    const bucket = this.storage.getBucketName();
    const clearSnapshotRequest = shouldClearSnapshotRequest(device, takenAt, nowMs);

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

        const devicePatch: {
          last_seen_at: Date;
          updated_at: Date;
          snapshot_requested_at?: null;
        } = {
          last_seen_at: ingestedAt,
          updated_at: ingestedAt
        };
        if (clearSnapshotRequest) {
          devicePatch.snapshot_requested_at = null;
        }

        await trx
          .updateTable("devices")
          .set(devicePatch)
          .where("device_id", "=", device.device_id)
          .execute();
      });
    } catch (e) {
      if (!hasPendingSnapshotRequest(device, nowMs)) {
        this.rateLimiter.rollbackLast(rateLimitKey);
      }
      throw e;
    }

    return { ok: true };
  }
}

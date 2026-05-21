import { Inject, Injectable } from "@nestjs/common";
import type { Database } from "@aquaponics/db";
import type { Kysely } from "kysely";
import { DB_TOKEN } from "../database/database.constants.js";
import { StorageService } from "../storage/storage.service.js";
import { DeviceSnapshotModel } from "./snapshots.types.js";

const RECENT_SNAPSHOT_LIMIT = 10;

@Injectable()
export class SnapshotsService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Kysely<Database>,
    private readonly storage: StorageService
  ) {}

  async toModel(row: {
    id: string;
    device_id: string;
    site_id: string;
    taken_at: Date | string;
    ingested_at: Date | string;
    content_type: string;
    byte_size: number;
    storage_key: string;
  }): Promise<DeviceSnapshotModel | null> {
    if (!this.storage.isConfigured()) {
      return null;
    }

    const imageUrl = await this.storage.getPresignedGetUrl(row.storage_key);

    return {
      id: row.id,
      deviceId: row.device_id,
      siteId: row.site_id,
      takenAt: new Date(row.taken_at as Date | string),
      ingestedAt: new Date(row.ingested_at as Date | string),
      contentType: row.content_type,
      byteSize: row.byte_size,
      imageUrl
    };
  }

  async getLatestForSite(siteId: string): Promise<DeviceSnapshotModel | null> {
    if (!this.storage.isConfigured()) {
      return null;
    }

    const row = await this.db
      .selectFrom("device_snapshots")
      .innerJoin("devices", "devices.device_id", "device_snapshots.device_id")
      .select([
        "device_snapshots.id",
        "device_snapshots.device_id",
        "device_snapshots.site_id",
        "device_snapshots.taken_at",
        "device_snapshots.ingested_at",
        "device_snapshots.content_type",
        "device_snapshots.byte_size",
        "device_snapshots.storage_key",
        "devices.has_camera"
      ])
      .where("device_snapshots.site_id", "=", siteId)
      .orderBy("devices.has_camera", "desc")
      .orderBy("device_snapshots.taken_at", "desc")
      .limit(1)
      .executeTakeFirst();

    if (!row) {
      return null;
    }

    return this.toModel(row);
  }

  async getRecentForDevice(deviceId: string): Promise<DeviceSnapshotModel[]> {
    if (!this.storage.isConfigured()) {
      return [];
    }

    const rows = await this.db
      .selectFrom("device_snapshots")
      .select([
        "id",
        "device_id",
        "site_id",
        "taken_at",
        "ingested_at",
        "content_type",
        "byte_size",
        "storage_key"
      ])
      .where("device_id", "=", deviceId)
      .orderBy("taken_at", "desc")
      .limit(RECENT_SNAPSHOT_LIMIT)
      .execute();

    const out: DeviceSnapshotModel[] = [];
    for (const row of rows) {
      const model = await this.toModel(row);
      if (model) {
        out.push(model);
      }
    }
    return out;
  }
}

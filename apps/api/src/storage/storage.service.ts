import { Injectable, Logger } from "@nestjs/common";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const DEFAULT_PRESIGN_SECONDS = 900;

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client | null;
  private readonly bucket: string | null;

  constructor() {
    const endpoint = process.env.OBJECT_STORAGE_ENDPOINT?.trim();
    const region = process.env.OBJECT_STORAGE_REGION?.trim() ?? "auto";
    const bucket = process.env.OBJECT_STORAGE_BUCKET?.trim();
    const accessKeyId = process.env.OBJECT_STORAGE_ACCESS_KEY_ID?.trim();
    const secretAccessKey = process.env.OBJECT_STORAGE_SECRET_ACCESS_KEY?.trim();

    if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
      this.client = null;
      this.bucket = null;
      return;
    }

    // Railway buckets use virtual-hosted style by default; set true only if the bucket
    // credentials tab indicates path-style (older buckets).
    const forcePathStyle = process.env.OBJECT_STORAGE_FORCE_PATH_STYLE === "true";

    this.client = new S3Client({
      region,
      endpoint,
      forcePathStyle,
      credentials: { accessKeyId, secretAccessKey }
    });
    this.bucket = bucket;
  }

  isConfigured(): boolean {
    return this.client != null && this.bucket != null;
  }

  getBucketName(): string {
    if (!this.bucket) {
      throw new Error("Object storage is not configured");
    }
    return this.bucket;
  }

  buildSnapshotKey(siteId: string, deviceId: string, takenAt: Date): string {
    const iso = takenAt.toISOString().replace(/[:.]/g, "-");
    return `snapshots/${siteId}/${deviceId}/${iso}.jpg`;
  }

  async putSnapshot(key: string, body: Buffer, contentType: string): Promise<void> {
    const client = this.client;
    const bucket = this.bucket;
    if (!client || !bucket) {
      throw new Error("Object storage is not configured");
    }

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType
      })
    );
    this.logger.debug(`Stored snapshot object: ${key}`);
  }

  async getPresignedGetUrl(
    key: string,
    expiresInSeconds: number = DEFAULT_PRESIGN_SECONDS
  ): Promise<string> {
    const client = this.client;
    const bucket = this.bucket;
    if (!client || !bucket) {
      throw new Error("Object storage is not configured");
    }

    return getSignedUrl(
      client,
      new GetObjectCommand({
        Bucket: bucket,
        Key: key
      }),
      { expiresIn: expiresInSeconds }
    );
  }
}

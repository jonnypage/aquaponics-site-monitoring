import { createHash } from "node:crypto";
import { UnauthorizedException } from "@nestjs/common";
import type { Database } from "@aquaponics/db";
import type { Kysely, Selectable } from "kysely";

export type DeviceRow = Selectable<Database["devices"]>;

export function sha256Hex(plaintext: string): string {
  return createHash("sha256").update(plaintext, "utf8").digest("hex");
}

export function requireApiKeyHeader(apiKeyHeader: string | undefined): string {
  if (apiKeyHeader === undefined || apiKeyHeader.trim() === "") {
    throw new UnauthorizedException("Missing x-api-key header");
  }
  return apiKeyHeader.trim();
}

export async function authenticateDeviceByApiKey(
  db: Kysely<Database>,
  apiKeyHeader: string | undefined,
  deviceId: string
): Promise<DeviceRow> {
  const apiKey = requireApiKeyHeader(apiKeyHeader);
  const keyHash = sha256Hex(apiKey);

  const device = await db
    .selectFrom("devices")
    .selectAll()
    .where("device_id", "=", deviceId)
    .executeTakeFirst();

  if (!device || device.api_key_hash !== keyHash) {
    throw new UnauthorizedException("Invalid API key or device");
  }

  return device;
}

import { BadRequestException } from "@nestjs/common";
import type { DevicePinMap } from "@aquaponics/db";

export function normalizeDevicePinMap(raw: unknown): DevicePinMap | null {
  if (raw == null) {
    return null;
  }
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new BadRequestException("pinMap must be a JSON object");
  }
  const out: DevicePinMap = {};
  for (const [sensorKey, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof sensorKey !== "string" || !sensorKey.trim()) {
      continue;
    }
    if (value == null) {
      out[sensorKey] = null;
      continue;
    }
    if (typeof value !== "object" || Array.isArray(value)) {
      throw new BadRequestException(`pinMap.${sensorKey} must be an object or null`);
    }
    const roles: Record<string, number> = {};
    for (const [roleId, gpio] of Object.entries(value as Record<string, unknown>)) {
      if (typeof gpio !== "number" || !Number.isFinite(gpio) || gpio < 0 || gpio > 255) {
        throw new BadRequestException(`pinMap.${sensorKey}.${roleId} must be a GPIO number 0–255`);
      }
      roles[roleId] = Math.floor(gpio);
    }
    out[sensorKey] = roles;
  }
  return out;
}

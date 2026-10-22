import type { DeviceRow } from "./device-auth.util.js";

/** Pending on-demand requests expire after one hour. */
export const DEVICE_REQUEST_TTL_MS = 60 * 60 * 1000;

export function isPendingDeviceRequest(
  requestedAt: Date | string | null | undefined,
  nowMs: number = Date.now()
): boolean {
  if (requestedAt == null) {
    return false;
  }
  const atMs = new Date(requestedAt as Date | string).getTime();
  if (!Number.isFinite(atMs)) {
    return false;
  }
  return nowMs - atMs <= DEVICE_REQUEST_TTL_MS;
}

export function isExpiredDeviceRequest(
  requestedAt: Date | string | null | undefined,
  nowMs: number = Date.now()
): boolean {
  if (requestedAt == null) {
    return false;
  }
  const atMs = new Date(requestedAt as Date | string).getTime();
  if (!Number.isFinite(atMs)) {
    return false;
  }
  return nowMs - atMs > DEVICE_REQUEST_TTL_MS;
}

export function deviceSendTelemetryNow(device: DeviceRow, nowMs: number = Date.now()): boolean {
  return isPendingDeviceRequest(device.telemetry_requested_at, nowMs);
}

export function deviceCaptureImageNow(
  device: DeviceRow,
  siteHasActiveAlert: boolean,
  nowMs: number = Date.now()
): boolean {
  const snapshotsActive = device.has_camera && device.snapshots_enabled;
  if (!snapshotsActive) {
    return false;
  }
  return isPendingDeviceRequest(device.snapshot_requested_at, nowMs) || siteHasActiveAlert;
}

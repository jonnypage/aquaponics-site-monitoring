import type { DeviceRow } from "./device-auth.util.js";
import { isExpiredDeviceRequest, isPendingDeviceRequest } from "./device-request.util.js";

export function shouldClearTelemetryRequest(
  device: DeviceRow,
  ingestTimestamp: Date,
  nowMs: number = Date.now()
): boolean {
  if (device.telemetry_requested_at == null) {
    return false;
  }
  if (isExpiredDeviceRequest(device.telemetry_requested_at, nowMs)) {
    return true;
  }
  const requestedMs = new Date(device.telemetry_requested_at).getTime();
  return ingestTimestamp.getTime() >= requestedMs;
}

export function shouldClearSnapshotRequest(
  device: DeviceRow,
  ingestTimestamp: Date,
  nowMs: number = Date.now()
): boolean {
  if (device.snapshot_requested_at == null) {
    return false;
  }
  if (isExpiredDeviceRequest(device.snapshot_requested_at, nowMs)) {
    return true;
  }
  const requestedMs = new Date(device.snapshot_requested_at).getTime();
  return ingestTimestamp.getTime() >= requestedMs;
}

export function hasPendingTelemetryRequest(device: DeviceRow, nowMs: number = Date.now()): boolean {
  return isPendingDeviceRequest(device.telemetry_requested_at, nowMs);
}

export function hasPendingSnapshotRequest(device: DeviceRow, nowMs: number = Date.now()): boolean {
  return isPendingDeviceRequest(device.snapshot_requested_at, nowMs);
}

import type { DeviceRow } from "./device-auth.util.js";
import { deviceCaptureImageNow, deviceSendTelemetryNow } from "./device-request.util.js";

export interface DeviceCommandEnvelope {
  reportIntervalSeconds: number;
  snapshotIntervalSeconds: number;
  checkinIntervalSeconds: number;
  hasCamera: boolean;
  captureImageNow: boolean;
  sendTelemetryNow: boolean;
}

export function buildDeviceCommands(
  device: DeviceRow,
  siteHasActiveAlert: boolean,
  nowMs: number = Date.now()
): DeviceCommandEnvelope {
  const snapshotsActive = device.has_camera && device.snapshots_enabled;
  return {
    reportIntervalSeconds: device.report_interval_seconds,
    snapshotIntervalSeconds: device.snapshot_interval_seconds,
    checkinIntervalSeconds: device.checkin_interval_seconds,
    hasCamera: snapshotsActive,
    captureImageNow: deviceCaptureImageNow(device, siteHasActiveAlert, nowMs),
    sendTelemetryNow: deviceSendTelemetryNow(device, nowMs)
  };
}

import {
  heuristicAlertDeviceId,
  heuristicAlertSensorType,
  rangeAlertPartsFromType,
  sensorCatalogKeyFromAlertType
} from "~/utils/alert-sensor-key";
import { sensorTypeLabelKey } from "~/utils/sensor-display-label";
import type { SensorType } from "~/utils/sensor-types";

export interface AlertReportingRow {
  deviceId: string;
  deviceName?: string | null;
  sensorKey: string;
  sensorType?: string;
  displayName?: string;
  model?: string;
  icon?: string | null;
}

export interface AlertDisplay {
  deviceId: string | null;
  deviceLabel: string | null;
  sensorLabel: string | null;
  message: string;
}

export function resolveAlertDeviceId(alert: {
  type: string;
  deviceId?: string | null;
}): string | null {
  return (
    alert.deviceId ??
    heuristicAlertDeviceId(alert.type) ??
    rangeAlertPartsFromType(alert.type)?.deviceId ??
    null
  );
}

function labelDevice(deviceId: string, name?: string | null): string {
  const trimmed = name?.trim();
  return trimmed ? trimmed : deviceId;
}

function familyLabel(sensorType: SensorType, t: (key: string) => string): string {
  return t(sensorTypeLabelKey(sensorType));
}

function lookupReportingRow(
  reporting: readonly AlertReportingRow[],
  deviceId: string,
  sensorKey: string | null,
  sensorType: SensorType | null
): AlertReportingRow | undefined {
  if (sensorKey) {
    const exact = reporting.find(
      (r) => r.deviceId === deviceId && r.sensorKey === sensorKey
    );
    if (exact) {
      return exact;
    }
  }
  if (sensorType) {
    return reporting.find(
      (r) => r.deviceId === deviceId && r.sensorType === sensorType
    );
  }
  return reporting.find((r) => r.deviceId === deviceId);
}

function labelSensor(
  row: AlertReportingRow | undefined,
  sensorType: SensorType | null,
  t: (key: string) => string
): string | null {
  if (row?.displayName?.trim()) {
    return row.displayName.trim();
  }
  if (row?.model?.trim()) {
    return row.model.trim();
  }
  if (sensorType) {
    return familyLabel(sensorType, t);
  }
  return null;
}

/** Strip legacy " on {device}" phrasing; device is shown in the header pill instead. */
function stripDeviceFromMessage(message: string, deviceLabel: string): string {
  if (!message.includes(deviceLabel)) {
    return message;
  }
  return message
    .replace(` on ${deviceLabel} `, " ")
    .replace(` on ${deviceLabel}`, "")
    .replace(`${deviceLabel}: `, "");
}

export function formatAlertDisplay(
  alert: {
    type: string;
    message: string;
    deviceId?: string | null;
    deviceName?: string | null;
  },
  reporting: readonly AlertReportingRow[],
  t: (key: string) => string
): AlertDisplay {
  const deviceId = resolveAlertDeviceId(alert);
  const rangeParts = rangeAlertPartsFromType(alert.type);
  const sensorKey =
    rangeParts?.sensorKey ?? sensorCatalogKeyFromAlertType(alert.type);
  const sensorType = heuristicAlertSensorType(alert.type);

  const row =
    deviceId != null
      ? lookupReportingRow(reporting, deviceId, sensorKey, sensorType)
      : undefined;

  const deviceLabel =
    deviceId != null
      ? labelDevice(deviceId, alert.deviceName ?? row?.deviceName)
      : null;
  const sensorLabel = labelSensor(row, sensorType, t);

  const message =
    deviceLabel != null
      ? stripDeviceFromMessage(alert.message, deviceLabel)
      : alert.message;

  return {
    deviceId,
    deviceLabel,
    sensorLabel,
    message
  };
}

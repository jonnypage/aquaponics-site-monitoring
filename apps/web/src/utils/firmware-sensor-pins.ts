/** Default GPIO pins for MVP catalog sensors (when included in install). */
export const DEFAULT_SENSOR_PINS: Record<string, string> = {
  temperature: "4",
  ph: "5",
  waterLevel: "12",
  waterFlow: "13"
};

export interface InstallSensorRow {
  sensorKey: string;
  displayName: string;
  icon: string | null;
  sortOrder: number;
  /** Enabled for this site in admin site settings. */
  siteEnabled: boolean;
  /** Included in this firmware flash (user toggle). */
  included: boolean;
  pin: string;
}

export function buildFirmwarePins(rows: InstallSensorRow[]): Record<string, number | null> {
  const pins: Record<string, number | null> = {};
  for (const row of rows) {
    if (!row.siteEnabled || !row.included) {
      pins[row.sensorKey] = null;
      continue;
    }
    const n = Number.parseInt(row.pin.trim(), 10);
    pins[row.sensorKey] = Number.isFinite(n) && n >= 0 ? n : null;
  }
  return pins;
}

export function hasIncludedPinnedSensor(rows: InstallSensorRow[]): boolean {
  return rows.some((row) => {
    if (!row.siteEnabled || !row.included) {
      return false;
    }
    const n = Number.parseInt(row.pin.trim(), 10);
    return Number.isFinite(n) && n >= 0;
  });
}

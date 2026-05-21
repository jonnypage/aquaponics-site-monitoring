export type DurationUnit = "seconds" | "minutes" | "hours";

export interface DurationValue {
  amount: string;
  unit: DurationUnit;
}

export const DEFAULT_REPORT_INTERVAL_SECONDS = 15 * 60;
export const DEFAULT_SNAPSHOT_INTERVAL_SECONDS = 30 * 60;

export const DEFAULT_REPORT_DURATION: DurationValue = { amount: "15", unit: "minutes" };
export const DEFAULT_SNAPSHOT_DURATION: DurationValue = { amount: "30", unit: "minutes" };

export function durationToSeconds(
  value: DurationValue,
  fallbackSeconds: number
): number {
  const n = Number.parseInt(value.amount.trim(), 10);
  if (!Number.isFinite(n) || n < 1) {
    return fallbackSeconds;
  }
  switch (value.unit) {
    case "hours":
      return n * 3600;
    case "minutes":
      return n * 60;
    case "seconds":
      return n;
    default:
      return fallbackSeconds;
  }
}

/** Pick hours, minutes, or seconds for display from a second count. */
export function secondsToDuration(seconds: number): DurationValue {
  if (seconds >= 3600 && seconds % 3600 === 0) {
    return { amount: String(seconds / 3600), unit: "hours" };
  }
  if (seconds >= 60 && seconds % 60 === 0) {
    return { amount: String(seconds / 60), unit: "minutes" };
  }
  return { amount: String(Math.max(1, seconds)), unit: "seconds" };
}

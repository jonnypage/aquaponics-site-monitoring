/** Per spec: max(checkin_interval_seconds * 3, 15 minutes). */
export function offlineThresholdSeconds(checkinIntervalSeconds: number): number {
  return Math.max(checkinIntervalSeconds * 3, 900);
}

export function isDeviceConsideredOffline(
  lastSeenAt: Date | null,
  checkinIntervalSeconds: number,
  nowMs: number = Date.now()
): boolean {
  const thresholdSec = offlineThresholdSeconds(checkinIntervalSeconds);
  const cutoffMs = nowMs - thresholdSec * 1000;
  if (lastSeenAt == null) {
    return true;
  }
  return lastSeenAt.getTime() < cutoffMs;
}

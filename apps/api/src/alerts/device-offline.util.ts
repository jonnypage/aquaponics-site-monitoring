/** Per spec: max(expected_interval_seconds * 3, 15 minutes). */
export function offlineThresholdSeconds(expectedIntervalSeconds: number): number {
  return Math.max(expectedIntervalSeconds * 3, 900);
}

export function isDeviceConsideredOffline(
  lastSeenAt: Date | null,
  expectedIntervalSeconds: number,
  nowMs: number = Date.now()
): boolean {
  const thresholdSec = offlineThresholdSeconds(expectedIntervalSeconds);
  const cutoffMs = nowMs - thresholdSec * 1000;
  if (lastSeenAt == null) {
    return true;
  }
  return lastSeenAt.getTime() < cutoffMs;
}

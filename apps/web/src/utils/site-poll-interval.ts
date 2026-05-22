/** Floor for site-scoped alert polling (5 minutes). */
export const SITE_ALERTS_REFETCH_MS = 5 * 60 * 1000;

const DEFAULT_POLL_INTERVAL_SECONDS = 300;

export function sitePollIntervalMs(pollIntervalSeconds?: number | null): number {
  const seconds =
    typeof pollIntervalSeconds === "number" &&
    Number.isFinite(pollIntervalSeconds) &&
    pollIntervalSeconds > 0
      ? pollIntervalSeconds
      : DEFAULT_POLL_INTERVAL_SECONDS;
  return seconds * 1000;
}

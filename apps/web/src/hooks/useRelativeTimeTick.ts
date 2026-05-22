import { useEffect, useState } from "react";

/** Re-render interval for `formatRelativeTime` labels (1 minute). */
export const RELATIVE_TIME_TICK_MS = 60_000;

/**
 * Forces a re-render on a fixed interval so relative-time strings
 * (e.g. "5 minutes ago") stay current without refetching server data.
 */
export function useRelativeTimeTick(intervalMs = RELATIVE_TIME_TICK_MS): void {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
}

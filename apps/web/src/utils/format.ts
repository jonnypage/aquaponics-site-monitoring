const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const rtf = typeof Intl !== "undefined" && typeof Intl.RelativeTimeFormat !== "undefined"
  ? new Intl.RelativeTimeFormat("en", { numeric: "auto" })
  : null;

export function formatRelativeTime(date: Date): string {
  const diffMs = date.getTime() - Date.now();
  const absMs = Math.abs(diffMs);
  if (!rtf) return date.toLocaleString();
  if (absMs < MINUTE) return rtf.format(Math.round(diffMs / SECOND), "second");
  if (absMs < HOUR) return rtf.format(Math.round(diffMs / MINUTE), "minute");
  if (absMs < DAY) return rtf.format(Math.round(diffMs / HOUR), "hour");
  return rtf.format(Math.round(diffMs / DAY), "day");
}

const TICK_FORMATTERS: Record<string, (d: Date) => string> = {
  hour: (d) => d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
  day: (d) => d.toLocaleDateString([], { month: "short", day: "numeric" }),
  date: (d) => d.toLocaleDateString([], { month: "short", day: "numeric" })
};

export function formatChartTick(date: Date, scale: "hour" | "day" | "date" = "hour"): string {
  return TICK_FORMATTERS[scale](date);
}

export function formatNumber(value: number, fractionDigits = 1): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits
  });
}

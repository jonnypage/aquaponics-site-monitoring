export const DASHBOARD_THEME_STORAGE_KEY = "dashboard-theme";

export const DASHBOARD_THEME_MODES = ["light", "dark", "system"] as const;

export type DashboardThemeMode = (typeof DASHBOARD_THEME_MODES)[number];

export function parseStoredDashboardTheme(raw: string | null): DashboardThemeMode {
  if (raw === "light" || raw === "dark" || raw === "system") return raw;
  return "system";
}

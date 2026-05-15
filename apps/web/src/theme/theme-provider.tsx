import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";

import {
  DASHBOARD_THEME_STORAGE_KEY,
  parseStoredDashboardTheme,
  type DashboardThemeMode
} from "./dashboard-theme-storage";

export type ResolvedDashboardTheme = "light" | "dark";

function readStoredMode(): DashboardThemeMode {
  if (typeof window === "undefined") return "system";
  return parseStoredDashboardTheme(localStorage.getItem(DASHBOARD_THEME_STORAGE_KEY));
}

function systemPrefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Applies theme to `document.documentElement`; returns resolved light/dark. */
export function applyDashboardThemeToDocument(mode: DashboardThemeMode): ResolvedDashboardTheme {
  const html = document.documentElement;
  let resolved: ResolvedDashboardTheme;
  if (mode === "dark") {
    resolved = "dark";
    html.classList.add("dark");
  } else if (mode === "light") {
    resolved = "light";
    html.classList.remove("dark");
  } else {
    resolved = systemPrefersDark() ? "dark" : "light";
    if (resolved === "dark") html.classList.add("dark");
    else html.classList.remove("dark");
  }
  html.style.colorScheme = resolved;
  return resolved;
}

type ThemeContextValue = {
  theme: DashboardThemeMode;
  setTheme: (mode: DashboardThemeMode) => void;
  resolvedTheme: ResolvedDashboardTheme;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [theme, setThemeState] = useState<DashboardThemeMode>(readStoredMode);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedDashboardTheme>("light");

  const commit = useCallback((mode: DashboardThemeMode) => {
    const resolved = applyDashboardThemeToDocument(mode);
    setResolvedTheme(resolved);
  }, []);

  useLayoutEffect(() => {
    commit(theme);
  }, [theme, commit]);

  useLayoutEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => commit("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme, commit]);

  const setTheme = useCallback((mode: DashboardThemeMode) => {
    setThemeState(mode);
    try {
      localStorage.setItem(DASHBOARD_THEME_STORAGE_KEY, mode);
    } catch {
      /* ignore quota / private mode */
    }
  }, []);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      resolvedTheme
    }),
    [theme, setTheme, resolvedTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useDashboardTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useDashboardTheme must be used within ThemeProvider");
  return ctx;
}

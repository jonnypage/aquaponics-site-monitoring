import { DASHBOARD_THEME_STORAGE_KEY } from "./dashboard-theme-storage";

/**
 * Runs in <head> before paint to reduce theme flash. Must stay in sync with
 * `applyDashboardThemeToDocument` in `theme-provider.tsx`.
 */
export const THEME_BOOTSTRAP_INLINE = `(()=>{try{var k=${JSON.stringify(DASHBOARD_THEME_STORAGE_KEY)};var t=localStorage.getItem(k);var d=document.documentElement;d.classList.remove("dark");var dark=t==="dark"||(t!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);if(dark){d.classList.add("dark");d.style.colorScheme="dark"}else{d.style.colorScheme="light"}}catch(e){}})();`;

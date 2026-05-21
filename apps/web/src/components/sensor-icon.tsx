import * as LucideIcons from "lucide-react";
import type { LucideIcon, LucideProps } from "lucide-react";

/**
 * Normalize stored catalog value to a `lucide-react` named export (PascalCase),
 * accepting kebab-case / snake_case / spaces like the Lucide docs URLs.
 */
export function normalizeLucideExportName(raw: string): string {
  const t = raw.trim();
  if (!t) {
    return "";
  }
  if (/[-_\s]/.test(t)) {
    return t
      .split(/[-_\s]+/)
      .filter(Boolean)
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
      .join("");
  }
  if (t[0] === t[0].toLowerCase()) {
    return t.charAt(0).toUpperCase() + t.slice(1);
  }
  return t;
}

function isLucideIcon(v: unknown): v is LucideIcon {
  return typeof v === "function" || (typeof v === "object" && v !== null && "$$typeof" in v);
}

/**
 * Resolve a Lucide export name to the component, or `null` if unknown / invalid.
 * Uses `import * as LucideIcons` (full namespace chunk) like the reference implementation.
 */
export function getLucideIcon(name: string | null | undefined) {
  if (!name?.trim()) {
    return null;
  }
  const key = normalizeLucideExportName(name);
  if (!key) {
    return null;
  }
  const Icon = (LucideIcons as Record<string, unknown>)[key];
  return isLucideIcon(Icon) ? Icon : null;
}

export function SensorIcon({
  name,
  className,
  ...props
}: { name: string | null | undefined; className?: string } & LucideProps) {
  const Cmp = getLucideIcon(name);
  if (!Cmp) {
    return null;
  }
  return <Cmp className={className} {...props} />;
}

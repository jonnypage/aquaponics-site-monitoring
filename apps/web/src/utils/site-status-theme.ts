import { SiteStatus } from "~/gql/generated/graphql";
import { cn } from "~/utils/cn";

/** Semi-transparent card surface aligned with `SiteStatusBadge` / badge variants. */
export function siteStatusCardClassName(status: SiteStatus): string {
  const base =
    "border transition-[box-shadow,background-color] hover:shadow-md";
  switch (status) {
    case SiteStatus.Ok:
      return cn(
        base,
        "border-emerald-500/25 bg-emerald-500/10 hover:bg-emerald-500/20 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:hover:bg-emerald-500/25"
      );
    case SiteStatus.Warning:
      return cn(
        base,
        "border-amber-500/25 bg-amber-500/10 hover:bg-amber-500/20 dark:border-amber-500/30 dark:bg-amber-500/15 dark:hover:bg-amber-500/25"
      );
    case SiteStatus.Critical:
      return cn(
        base,
        "border-destructive/25 bg-destructive/10 hover:bg-destructive/20 dark:border-destructive/30 dark:bg-destructive/15 dark:hover:bg-destructive/25"
      );
    default:
      return cn(
        base,
        "border-border bg-secondary/40 hover:bg-secondary/60 dark:bg-secondary/30 dark:hover:bg-secondary/50"
      );
  }
}

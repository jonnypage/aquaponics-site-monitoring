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

/** Map pin title chip on `/sites` overview — solid fill for readability on satellite tiles. */
export function siteStatusMapPinLabelClassName(status: SiteStatus): string {
  switch (status) {
    case SiteStatus.Ok:
      return "border-2 border-emerald-600 bg-emerald-600 text-white dark:border-emerald-500 dark:bg-emerald-600";
    case SiteStatus.Warning:
      return "border-2 border-amber-500 bg-amber-500 text-amber-950 dark:border-amber-400 dark:bg-amber-500";
    case SiteStatus.Critical:
      return "border-2 border-destructive bg-destructive text-destructive-foreground";
    default:
      return "border-2 border-border bg-muted text-foreground dark:bg-secondary dark:text-secondary-foreground";
  }
}

/** Site name link hover — matches card/badge status (OK keeps primary green). */
export function siteStatusTitleHoverClassName(status: SiteStatus): string {
  switch (status) {
    case SiteStatus.Ok:
      return "group-hover:text-primary";
    case SiteStatus.Warning:
      return "group-hover:text-amber-600 dark:group-hover:text-amber-400";
    case SiteStatus.Critical:
      return "group-hover:text-destructive";
    default:
      return "group-hover:text-primary";
  }
}

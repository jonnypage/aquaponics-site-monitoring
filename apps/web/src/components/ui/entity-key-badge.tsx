import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "~/utils/cn";

export interface EntityKeyBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
}

/** Monospace pill for site IDs, sensor keys, device IDs, and similar technical identifiers. */
export function EntityKeyBadge({ children, className, ...props }: EntityKeyBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center rounded-md border border-border bg-muted/80 px-2 py-0.5 font-mono text-xs font-normal leading-none text-foreground",
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

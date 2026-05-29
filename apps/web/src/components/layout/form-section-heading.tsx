import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "~/utils/cn";

export interface FormSectionHeadingProps {
  children: ReactNode;
  className?: string;
  /** Pass through for `aria-labelledby` on related fields. */
  id?: string;
  /** Optional Lucide icon shown before the title. */
  icon?: LucideIcon;
}

/** In-form section title (below page `PageHeader`, above fields). */
export function FormSectionHeading({
  children,
  className,
  id,
  icon: Icon
}: FormSectionHeadingProps) {
  return (
    <h2
      id={id}
      className={cn(
        "flex items-center gap-2 border-b border-border pb-2 text-lg font-semibold tracking-tight text-foreground",
        className
      )}
    >
      {Icon ? <Icon className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden /> : null}
      {children}
    </h2>
  );
}

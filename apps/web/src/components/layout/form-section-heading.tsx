import type { ReactNode } from "react";

import { cn } from "~/utils/cn";

export interface FormSectionHeadingProps {
  children: ReactNode;
  className?: string;
  /** Pass through for `aria-labelledby` on related fields. */
  id?: string;
}

/** In-form section title (below page `PageHeader`, above fields). */
export function FormSectionHeading({ children, className, id }: FormSectionHeadingProps) {
  return (
    <h2
      id={id}
      className={cn(
        "border-b border-border pb-2 text-lg font-semibold tracking-tight text-foreground",
        className
      )}
    >
      {children}
    </h2>
  );
}

import type { ReactNode } from "react";

import { Card, CardContent } from "~/components/ui/card";
import { cn } from "~/utils/cn";

export interface SectionFrameProps {
  children: ReactNode;
  className?: string;
}

/** Muted panel frame shared by dashboard sections (e.g. sites grid, overview map). */
export function SectionFrame({ children, className }: SectionFrameProps) {
  return (
    <Card className={cn("border-border bg-section text-section-foreground shadow-sm", className)}>
      <CardContent className="space-y-2 pt-6">{children}</CardContent>
    </Card>
  );
}

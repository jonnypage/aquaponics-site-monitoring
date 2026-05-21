import { Link, type LinkProps } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "~/components/ui/button";
import { cn } from "~/utils/cn";

export function PageBackLink({
  to,
  params,
  children,
  className
}: {
  to: LinkProps["to"];
  params?: LinkProps["params"];
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-4", className)}>
      <Button variant="outline" size="sm" asChild>
        <Link to={to} params={params} className="inline-flex items-center gap-2">
          <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
          {children}
        </Link>
      </Button>
    </div>
  );
}

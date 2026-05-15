import { Loader2 } from "lucide-react";

import { cn } from "~/utils/cn";

export interface SpinnerProps {
  className?: string;
  size?: "sm" | "md";
}

export function Spinner({ className, size = "md" }: SpinnerProps) {
  const dim = size === "sm" ? "h-4 w-4" : "h-6 w-6";
  return <Loader2 className={cn("animate-spin", dim, className)} aria-hidden />;
}

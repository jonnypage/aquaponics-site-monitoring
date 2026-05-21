import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { Spinner } from "~/components/ui/spinner";
import { cn } from "~/utils/cn";

export function LoadingIndicator({
  className,
  size = "md",
  label
}: {
  className?: string;
  size?: "sm" | "md";
  label?: string;
}) {
  const { t } = useTranslation();
  const text = label ?? t("shared.loading");

  return (
    <div role="status" className={cn("flex items-center justify-center gap-2", className)}>
      <Spinner size={size} />
      <span className="text-sm text-muted-foreground">{text}</span>
    </div>
  );
}

/** Spinner + label while a button action is in flight (keeps the action label visible). */
export function ButtonPendingLabel({
  pending,
  children
}: {
  pending: boolean;
  children: ReactNode;
}) {
  if (!pending) {
    return <>{children}</>;
  }
  return (
    <span className="inline-flex items-center gap-2">
      <Spinner size="sm" />
      <span>{children}</span>
    </span>
  );
}

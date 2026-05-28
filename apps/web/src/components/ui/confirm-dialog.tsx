import { type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "~/components/ui/dialog";
import { Spinner } from "~/components/ui/spinner";

export type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** `destructive` styles the confirm action as dangerous (e.g. delete). */
  confirmTone?: "default" | "destructive";
  pending?: boolean;
  /** Shown on the confirm button while `pending` is true. */
  pendingLabel?: string;
  onConfirm: () => void;
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  children,
  confirmLabel,
  cancelLabel,
  confirmTone = "default",
  pending = false,
  pendingLabel,
  onConfirm
}: ConfirmDialogProps) {
  const { t } = useTranslation();

  function handleOpenChange(next: boolean) {
    if (pending) {
      return;
    }
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-md [&>button.absolute]:hidden"
        onPointerDownOutside={(e) => {
          if (pending) {
            e.preventDefault();
          }
        }}
        onEscapeKeyDown={(e) => {
          if (pending) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription asChild>
            <div>{children}</div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => handleOpenChange(false)}
          >
            {cancelLabel ?? t("admin.shared.cancel")}
          </Button>
          <Button
            type="button"
            variant={confirmTone === "destructive" ? "destructive" : "default"}
            disabled={pending}
            className="gap-2"
            onClick={onConfirm}
          >
            {pending ? (
              <>
                <Spinner
                  className={
                    confirmTone === "destructive"
                      ? "text-destructive-foreground"
                      : "text-primary-foreground"
                  }
                  size="sm"
                />
                {pendingLabel ?? `${confirmLabel ?? t("admin.shared.confirm")}…`}
              </>
            ) : (
              confirmLabel ?? t("admin.shared.confirm")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

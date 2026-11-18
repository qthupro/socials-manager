import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import { getErrorMessage } from "@/shared/api";
import { AppDialog, AppDialogClose } from "@/shared/components/app-dialog";
import { Button } from "@/shared/components/ui/button";

interface ConfirmDialogProps {
  /** Element that opens the dialog. Omit when controlling with `open` (e.g. from a menu). */
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  tone?: "primary" | "danger";
  /** May return a promise; the dialog shows a busy state and closes when it resolves. */
  onConfirm: () => unknown;
  children?: ReactNode;
}

/** Yes/no confirmation built on AppDialog. Errors from onConfirm are shown as a toast. */
export function ConfirmDialog({
  trigger,
  open: controlledOpen,
  onOpenChange,
  title,
  description,
  confirmLabel = "Xác nhận",
  tone = "danger",
  onConfirm,
  children,
}: ConfirmDialogProps) {
  const [innerOpen, setInnerOpen] = useState(false);
  const open = controlledOpen ?? innerOpen;
  const setOpen = (next: boolean) => {
    setInnerOpen(next);
    onOpenChange?.(next);
  };
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
      setOpen(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppDialog
      open={open}
      onOpenChange={setOpen}
      trigger={trigger}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <AppDialogClose asChild>
            <Button variant="outline" size="sm" disabled={busy}>
              Huỷ
            </Button>
          </AppDialogClose>
          <Button
            size="sm"
            variant={tone === "danger" ? "destructive" : "default"}
            disabled={busy}
            onClick={confirm}
          >
            {busy ? "Đang xử lý…" : confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </AppDialog>
  );
}

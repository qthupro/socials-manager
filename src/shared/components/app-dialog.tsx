import type { ReactNode } from "react";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import { cn } from "@/shared/lib/utils";

const SIZES = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-lg",
  lg: "sm:max-w-2xl",
};

export interface AppDialogProps {
  /** Element that opens the dialog. Omit when controlling with `open`. */
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;

  title: ReactNode;
  description?: ReactNode;
  size?: keyof typeof SIZES;

  /** Footer buttons (right side). */
  footer?: ReactNode;
  /** Short note on the left of the footer. */
  footerNote?: ReactNode;

  children?: ReactNode;
  className?: string;
}

/**
 * The app's standard dialog: the stock shadcn Dialog with a
 * title / description / body / footer layout. Use this for every dialog.
 *
 * @example
 * <AppDialog
 *   trigger={<Button>Mở</Button>}
 *   title="Tiêu đề"
 *   description="Mô tả ngắn"
 *   footer={<AppDialogClose asChild><Button>Đóng</Button></AppDialogClose>}
 * >
 *   Nội dung…
 * </AppDialog>
 */
export function AppDialog({
  trigger,
  open,
  onOpenChange,
  title,
  description,
  size = "md",
  footer,
  footerNote,
  children,
  className,
}: AppDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent
        // Radix warns when there's no Description; opt out explicitly when none is given.
        {...(description ? {} : { "aria-describedby": undefined })}
        className={cn("max-h-[calc(100%-2rem)] overflow-y-auto", SIZES[size], className)}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        {children}

        {(footer || footerNote) && (
          <DialogFooter className="sm:items-center">
            {footerNote && <p className="text-xs text-muted-foreground sm:mr-auto">{footerNote}</p>}
            {footer}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Wrap any button with this (asChild) to make it close the dialog. */
export const AppDialogClose = DialogClose;

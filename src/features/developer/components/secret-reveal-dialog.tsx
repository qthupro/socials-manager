import { TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

import { AppDialog, AppDialogClose } from "@/shared/components/app-dialog";
import { CopyButton } from "@/shared/components/copy-button";
import { Button } from "@/shared/components/ui/button";

/** Shows a secret SocialAPI returns only once (new API key, webhook signing secret). */
export function SecretRevealDialog({
  open,
  onOpenChange,
  title,
  label,
  secret,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  label: string;
  secret: string;
  children?: ReactNode;
}) {
  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      footer={
        <AppDialogClose asChild>
          <Button size="sm">Tôi đã lưu lại</Button>
        </AppDialogClose>
      }
    >
      <div className="space-y-4">
        <div className="flex gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <p>
            Chỉ hiển thị <b>một lần duy nhất</b>. Sao chép và lưu vào nơi an toàn — SocialAPI không
            trả lại giá trị này nữa.
          </p>
        </div>
        <div className="grid gap-1.5">
          <p className="text-sm font-medium">{label}</p>
          <div className="flex items-center gap-1 rounded-lg border bg-muted/50 py-1 pr-1 pl-3">
            <code className="min-w-0 flex-1 font-mono text-xs break-all select-all">{secret}</code>
            <CopyButton value={secret} />
          </div>
        </div>
        {children}
      </div>
    </AppDialog>
  );
}

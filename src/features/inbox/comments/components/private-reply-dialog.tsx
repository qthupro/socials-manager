import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import { AppDialog, AppDialogClose } from "@/shared/components/app-dialog";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";

import type { Comment } from "../types";

/** Instagram & Facebook: DM the commenter — once per comment, within 7 days (1 credit). */
export function PrivateReplyDialog({
  comment,
  trigger,
  onSend,
}: {
  comment: Comment;
  trigger: ReactNode;
  /** Rejects on failure (the caller shows the error); the dialog then stays open. */
  onSend: (text: string) => Promise<unknown>;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  // Instagram's limit is 1,000 bytes UTF-8; Facebook's 2,000 characters.
  const instagram = comment.platform.startsWith("instagram");
  const limit = instagram ? 1000 : 2000;
  const length = instagram ? new TextEncoder().encode(text).length : text.length;
  const name = comment.author_name || comment.author_username || "người bình luận";

  const send = async () => {
    setSending(true);
    try {
      await onSend(text.trim());
      toast.success(`Đã nhắn riêng cho ${name}`);
      setText("");
      setOpen(false);
    } catch {
      // Error already shown; keep the draft.
    } finally {
      setSending(false);
    }
  };

  return (
    <AppDialog
      open={open}
      onOpenChange={setOpen}
      trigger={trigger}
      title={`Nhắn riêng cho ${name}`}
      description="Gửi vào hộp thư của người bình luận. Mỗi bình luận chỉ nhắn riêng được 1 lần, trong vòng 7 ngày."
      footer={
        <>
          <AppDialogClose asChild>
            <Button variant="outline" size="sm" disabled={sending}>
              Huỷ
            </Button>
          </AppDialogClose>
          <Button size="sm" disabled={!text.trim() || length > limit || sending} onClick={send}>
            {sending ? "Đang gửi…" : "Gửi"}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <blockquote className="rounded-lg border-l-2 border-primary/50 bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
          {comment.text}
        </blockquote>
        <Textarea
          autoFocus
          rows={4}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Nội dung tin nhắn…"
        />
        <p className="text-right text-xs text-muted-foreground">
          {length}/{limit}
          {instagram && " byte"}
        </p>
      </div>
    </AppDialog>
  );
}

import { SendHorizontal } from "lucide-react";
import { useState, type KeyboardEvent } from "react";

import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";

/** Single-line-growing text box for a reply / comment. Enter sends, Shift+Enter breaks. */
export function CommentComposer({
  placeholder,
  onSend,
  onCancel,
  maxLength,
  autoFocus,
  className,
}: {
  placeholder: string;
  /** May return a promise; the text is kept if it rejects. */
  onSend: (text: string) => unknown;
  onCancel?: () => void;
  /** Platform reply limit (e.g. X 280, Bluesky 300, Threads 500). */
  maxLength?: number;
  autoFocus?: boolean;
  className?: string;
}) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const tooLong = !!maxLength && text.length > maxLength;

  const send = async () => {
    const value = text.trim();
    if (!value || tooLong || sending) return;
    setSending(true);
    try {
      await onSend(value);
      setText("");
    } catch {
      // The caller reports the error; keep the text so it can be retried.
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    } else if (e.key === "Escape") {
      onCancel?.();
    }
  };

  return (
    <div
      className={cn(
        "flex items-end gap-1 rounded-xl border bg-muted/40 p-1 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15",
        className,
      )}
    >
      <textarea
        rows={1}
        autoFocus={autoFocus}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className="field-sizing-content max-h-32 min-h-8 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground"
      />
      {maxLength && text.length > maxLength * 0.8 && (
        <span
          className={cn("pb-2 text-[11px] text-muted-foreground", tooLong && "text-destructive")}
        >
          {text.length}/{maxLength}
        </span>
      )}
      <Button
        size="icon-sm"
        onClick={send}
        disabled={!text.trim() || tooLong || sending}
        title="Gửi (Enter)"
      >
        <SendHorizontal />
      </Button>
    </div>
  );
}

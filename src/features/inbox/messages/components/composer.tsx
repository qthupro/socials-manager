import {
  FileText,
  Loader2,
  Lock,
  Paperclip,
  Reply,
  SendHorizontal,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import { useRef, useState, type KeyboardEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";

import {
  isReplyAssistantAvailable,
  suggestReplies,
  type ConversationContext,
} from "../ai/reply-assistant";
import type { DmCapabilities } from "../lib/capabilities";
import { QUICK_REPLIES } from "../lib/quick-replies";

const MAX_FILE_MB = 25;
const MAX_FILES = 10;

interface PickedFile {
  file: File;
  /** Object URL for image previews. */
  preview?: string;
}

interface ComposerProps {
  caps: DmCapabilities;
  /** When set, sending is blocked and this is shown instead. */
  lockedReason?: string;
  onSend: (text: string, files: File[]) => void;
  onTyping?: () => void;
  replyTo?: string;
  onCancelReply?: () => void;
  /** Supplies the thread to the AI assistant. */
  getAiContext: () => ConversationContext;
  /** Interaction credits left this period; null = unlimited / unknown. */
  creditsLeft?: number | null;
  placeholder?: string;
}

export function Composer({
  caps,
  lockedReason,
  onSend,
  onTyping,
  replyTo,
  onCancelReply,
  getAiContext,
  creditsLeft,
  placeholder,
}: ComposerProps) {
  const [text, setText] = useState("");
  const [files, setFiles] = useState<PickedFile[]>([]);
  const [chips, setChips] = useState<{ kind: "quick" | "ai"; items: string[] } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const locked = !!lockedReason;
  const tooLong = text.length > caps.textMax;
  const canSend = !locked && !tooLong && (text.trim() !== "" || files.length > 0);
  const aiAvailable = isReplyAssistantAvailable();

  const reset = () => {
    for (const f of files) if (f.preview) URL.revokeObjectURL(f.preview);
    setText("");
    setFiles([]);
    setChips(null);
  };

  const send = () => {
    if (!canSend) return;
    onSend(
      text.trim(),
      files.map((f) => f.file),
    );
    reset();
  };

  // Enter sends, Shift+Enter makes a new line.
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  };

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const picked: PickedFile[] = [];
    for (const file of Array.from(list)) {
      if (file.size > MAX_FILE_MB * 1024 * 1024) {
        toast.error(`${file.name} vượt quá ${MAX_FILE_MB} MB`);
        continue;
      }
      picked.push({
        file,
        preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
      });
    }
    setFiles((prev) => [...prev, ...picked].slice(0, MAX_FILES));
  };

  const removeFile = (index: number) =>
    setFiles((prev) => {
      const f = prev[index];
      if (f?.preview) URL.revokeObjectURL(f.preview);
      return prev.filter((_, i) => i !== index);
    });

  const askAi = async () => {
    setAiLoading(true);
    try {
      const items = await suggestReplies(getAiContext());
      setChips({ kind: "ai", items });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setAiLoading(false);
    }
  };

  if (locked) {
    return (
      <div className="flex items-center gap-2 border-t bg-muted/40 px-4 py-4 text-sm text-muted-foreground">
        <Lock className="size-4 shrink-0" />
        {lockedReason}
      </div>
    );
  }

  return (
    <div className="border-t bg-background p-3">
      {replyTo !== undefined && (
        <div className="mb-2 flex items-center gap-2 rounded-lg border-l-2 border-primary bg-muted/60 px-3 py-1.5 text-xs">
          <Reply className="size-3.5 shrink-0 text-primary" />
          <span className="min-w-0 flex-1 truncate text-muted-foreground">
            Trả lời: {replyTo || "tin nhắn"}
          </span>
          <button type="button" onClick={onCancelReply} aria-label="Huỷ trả lời">
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {chips && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {chips.kind === "ai" && <Sparkles className="mt-1 size-3.5 text-primary" />}
          {chips.items.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => {
                setText(q);
                setChips(null);
              }}
              className="max-w-full truncate rounded-full border bg-muted/50 px-3 py-1 text-xs hover:bg-muted"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {files.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {files.map((f, i) => (
            <div key={i} className="group relative">
              {f.preview ? (
                <img src={f.preview} alt="" className="size-16 rounded-lg object-cover" />
              ) : (
                <div className="flex h-16 w-32 items-center gap-1.5 rounded-lg border bg-muted/40 px-2 text-xs">
                  <FileText className="size-4 shrink-0" />
                  <span className="truncate">{f.file.name}</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => removeFile(i)}
                aria-label="Bỏ tệp"
                className="absolute -top-1.5 -right-1.5 rounded-full bg-foreground p-0.5 text-background"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-1 rounded-2xl border bg-muted/40 p-1.5 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15">
        <div className="flex">
          <input
            ref={fileInput}
            type="file"
            multiple
            hidden
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <Button
            variant="ghost"
            size="icon-sm"
            title={caps.attachments ? "Đính kèm ảnh / tệp" : "Kênh này chỉ gửi được chữ"}
            disabled={!caps.attachments}
            onClick={() => fileInput.current?.click()}
          >
            <Paperclip />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            title="Trả lời nhanh"
            onClick={() =>
              setChips(chips?.kind === "quick" ? null : { kind: "quick", items: QUICK_REPLIES })
            }
            className={chips?.kind === "quick" ? "text-primary" : undefined}
          >
            <Zap />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            title={aiAvailable ? "AI gợi ý câu trả lời" : "Sắp có: AI gợi ý câu trả lời"}
            disabled={!aiAvailable || aiLoading}
            onClick={askAi}
          >
            {aiLoading ? <Loader2 className="animate-spin" /> : <Sparkles />}
          </Button>
        </div>

        <textarea
          rows={1}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            onTyping?.();
          }}
          onKeyDown={onKeyDown}
          placeholder={placeholder ?? "Nhập tin nhắn…"}
          className="field-sizing-content max-h-36 min-h-8 flex-1 resize-none bg-transparent px-1.5 py-1.5 text-sm outline-none placeholder:text-muted-foreground"
        />

        <Button size="icon-sm" title="Gửi (Enter)" onClick={send} disabled={!canSend}>
          <SendHorizontal />
        </Button>
      </div>

      <div className="mt-1.5 flex items-center justify-between gap-3 px-2 text-[11px] text-muted-foreground">
        <span>Enter để gửi · Shift + Enter xuống dòng</span>
        <span className="flex items-center gap-3">
          {creditsLeft !== null && creditsLeft !== undefined && (
            <span className={cn(creditsLeft <= 5 && "text-amber-600")}>
              Còn {creditsLeft} lượt gửi
            </span>
          )}
          {text.length > caps.textMax * 0.8 && (
            <span className={cn(tooLong && "font-medium text-destructive")}>
              {text.length}/{caps.textMax}
            </span>
          )}
        </span>
      </div>
    </div>
  );
}

import {
  Check,
  CheckCheck,
  CircleAlert,
  Clock,
  RotateCcw,
  Reply,
  SmilePlus,
  Trash2,
} from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { cn } from "@/shared/lib/utils";

import { formatTime } from "../lib/format";
import type { MessageStatus } from "../types";
import { MessageAttachment } from "./message-attachment";

const REACTIONS = ["❤️", "😂", "😮", "😢", "😡", "👍"];

const STATUS_ICONS: Record<string, { icon: typeof Check; label: string; className?: string }> = {
  sending: { icon: Clock, label: "Đang gửi" },
  pending: { icon: Clock, label: "Đang chờ gửi" },
  sent: { icon: Check, label: "Đã gửi" },
  delivered: { icon: CheckCheck, label: "Đã nhận" },
  read: { icon: CheckCheck, label: "Đã xem", className: "text-primary" },
  failed: { icon: CircleAlert, label: "Không gửi được", className: "text-destructive" },
};

/** Small delivery-state icon; the label shows on hover. */
function StatusIcon({ status }: { status?: MessageStatus | "sending" }) {
  const s = status ? STATUS_ICONS[status] : undefined;
  if (!s) return null;
  const Icon = s.icon;
  return (
    <span title={s.label} className="inline-flex">
      <Icon className={cn("size-3", s.className)} />
    </span>
  );
}

/** UI shape shared by API messages and local, not-yet-confirmed sends. */
export interface BubbleData {
  key: string;
  outgoing: boolean;
  text: string | null;
  attachment?: { type: string; url: string | null };
  /** Local file previews for a pending send. */
  localImages?: string[];
  createdAt: string;
  status?: MessageStatus | "sending";
  /** Error text for a failed local send. */
  error?: string;
  /** Text of the message this one replies to. */
  quoted?: string;
}

interface MessageBubbleProps {
  data: BubbleData;
  /** First / last of a run from the same side — shapes corners and shows the time. */
  first: boolean;
  last: boolean;
  myReaction?: string;
  onReact?: (emoji: string | null) => void;
  onReply?: () => void;
  onRetry?: () => void;
  onDiscard?: () => void;
}

export function MessageBubble({
  data: m,
  first,
  last,
  myReaction,
  onReact,
  onReply,
  onRetry,
  onDiscard,
}: MessageBubbleProps) {
  const out = m.outgoing;
  // Attachment-only outgoing messages carry the placeholder text "[Attachment]".
  const text = m.text && !(m.attachment && m.text === "[Attachment]") ? m.text : null;
  const failed = m.status === "failed";

  const actions = (onReact || onReply) && !m.status?.startsWith("send") && (
    <div
      className={cn(
        "flex items-center opacity-0 transition-opacity group-hover:opacity-100",
        out ? "order-first" : "",
      )}
    >
      {onReact && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="size-7" title="Thả cảm xúc">
              <SmilePlus />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" className="flex min-w-0 gap-0.5 p-1">
            {REACTIONS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => onReact(myReaction === e ? null : e)}
                className={cn(
                  "rounded-md p-1 text-lg transition-transform hover:scale-125",
                  myReaction === e && "bg-primary/15",
                )}
              >
                {e}
              </button>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {onReply && (
        <Button variant="ghost" size="icon-sm" className="size-7" title="Trả lời" onClick={onReply}>
          <Reply />
        </Button>
      )}
    </div>
  );

  return (
    <div className={cn("group flex flex-col", out ? "items-end" : "items-start")}>
      <div className={cn("flex max-w-[70%] items-center gap-1", out && "flex-row-reverse")}>
        <div className={cn("relative flex min-w-0 flex-col gap-1", out && "items-end")}>
          {m.quoted && (
            <div className="max-w-full truncate rounded-xl border-l-2 border-primary/50 bg-muted/60 px-3 py-1 text-xs text-muted-foreground">
              {m.quoted}
            </div>
          )}

          {m.attachment && (
            <MessageAttachment type={m.attachment.type} url={m.attachment.url} outgoing={out} />
          )}
          {m.localImages?.map((src) => (
            <img key={src} src={src} alt="" className="max-h-48 max-w-56 rounded-xl opacity-70" />
          ))}

          {text && (
            <div
              title={formatTime(m.createdAt)}
              className={cn(
                "rounded-2xl px-3.5 py-2 text-sm leading-relaxed break-words whitespace-pre-wrap",
                out ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
                out
                  ? cn(!first && "rounded-tr-md", !last && "rounded-br-md")
                  : cn(!first && "rounded-tl-md", !last && "rounded-bl-md"),
                failed && "bg-destructive/80",
                m.status === "sending" && "opacity-70",
              )}
            >
              {text}
            </div>
          )}

          {myReaction && (
            <span
              className={cn(
                "absolute -bottom-2.5 rounded-full bg-background px-1 text-xs shadow-sm ring-1 ring-border",
                out ? "left-1" : "right-1",
              )}
            >
              {myReaction}
            </span>
          )}
        </div>
        {actions}
      </div>

      {failed ? (
        <div className="mt-1 flex items-center gap-2 px-1 text-[11px] text-destructive">
          <CircleAlert className="size-3.5" />
          {/* Local sends carry an error; platform-reported failures (e.g. WhatsApp) don't. */}
          <span className="max-w-80 truncate" title={m.error}>
            {m.error ?? `Không gửi được · ${formatTime(m.createdAt)}`}
          </span>
          {onRetry && (
            <button type="button" onClick={onRetry} className="flex items-center gap-0.5 underline">
              <RotateCcw className="size-3" /> Thử lại
            </button>
          )}
          {onDiscard && (
            <button
              type="button"
              onClick={onDiscard}
              className="flex items-center gap-0.5 underline"
            >
              <Trash2 className="size-3" /> Bỏ
            </button>
          )}
        </div>
      ) : (
        last && (
          <span
            className={cn(
              "mt-1 flex items-center gap-1 px-1 text-[11px] text-muted-foreground",
              myReaction && "mt-3",
            )}
          >
            {formatTime(m.createdAt)}
            {out && <StatusIcon status={m.status} />}
          </span>
        )
      )}
    </div>
  );
}

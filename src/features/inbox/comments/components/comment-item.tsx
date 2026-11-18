import {
  Check,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Heart,
  Loader2,
  MessageCircleReply,
  Send,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";
import { useState, type ComponentProps, type ReactNode } from "react";

import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { cn } from "@/shared/lib/utils";

import { ContactAvatar } from "../../messages/components/contact-avatar";
import { formatListTime, formatTime } from "../../messages/lib/format";
import { useReplies } from "../api/queries";
import { useCommentMarks, type CommentHistoryEntry } from "../store/marks-store";
import type { CommentStatus } from "../lib/status";
import type { Comment, InboxPost, ModerationStatus } from "../types";
import { CommentComposer } from "./comment-composer";
import { PrivateReplyDialog } from "./private-reply-dialog";

/** Actions resolve when done and reject with the API error (callers toast it). */
export interface CommentActions {
  onLike: (c: Comment) => Promise<unknown>;
  onHide: (c: Comment) => Promise<unknown>;
  onDelete: (c: Comment) => Promise<unknown>;
  /** Reply to `parent` (a top-level comment). */
  onReply: (text: string, parent: Comment) => Promise<unknown>;
  onModerate: (c: Comment, status: ModerationStatus) => Promise<unknown>;
  onPrivateReply: (c: Comment, text: string) => Promise<unknown>;
}

/** Small text action. Spreads props so it can be a Radix `asChild` trigger. */
function ActionButton({
  icon,
  label,
  active,
  danger,
  className,
  ...props
}: ComponentProps<"button"> & {
  icon: ReactNode;
  label: string;
  active?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-3.5",
        active && "text-primary hover:text-primary",
        danger && "hover:text-destructive",
        className,
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function StatusChip({
  icon,
  label,
  className,
}: {
  icon: ReactNode;
  label: string;
  className: string;
}) {
  return (
    <span
      className={cn(
        "flex items-center gap-1 rounded-full px-1.5 py-px text-[10px] font-medium [&_svg]:size-3",
        className,
      )}
    >
      {icon}
      {label}
    </span>
  );
}

const NO_HISTORY: CommentHistoryEntry[] = [];

const HISTORY_STYLE = {
  reply: {
    icon: <MessageCircleReply />,
    label: "Đã trả lời công khai",
    className: "text-green-700 dark:text-green-400",
  },
  private: { icon: <Send />, label: "Đã nhắn riêng", className: "text-sky-700 dark:text-sky-400" },
};

/** Everything answered from this app on a comment: what, when, by hand or automatically. */
function HandledHistory({ entries }: { entries: CommentHistoryEntry[] }) {
  return (
    <div className="mt-2 max-w-xl rounded-xl border bg-muted/30 px-3 py-2">
      <p className="mb-1 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
        Lịch sử xử lý
      </p>
      <ul className="space-y-1.5">
        {entries.map((e, i) => {
          const s = HISTORY_STYLE[e.kind];
          return (
            <li key={i}>
              <p
                className={cn(
                  "flex items-center gap-1.5 text-[11px] font-medium [&_svg]:size-3",
                  s.className,
                )}
              >
                {s.icon}
                {s.label}
                <span className="font-normal text-muted-foreground">
                  · {formatListTime(e.at)} {formatTime(e.at)}
                </span>
                {e.auto && (
                  <span className="rounded-full bg-primary/15 px-1.5 text-[10px] text-primary">
                    tự động
                  </span>
                )}
              </p>
              <p
                className={cn(
                  "text-sm whitespace-pre-wrap",
                  !e.text && "text-xs text-muted-foreground",
                )}
              >
                {e.text ?? "(Gửi ngoài app — không có nội dung)"}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

interface CommentItemProps {
  post: InboxPost;
  comment: Comment;
  actions: CommentActions;
  /** The top-level comment this one belongs to (for replies). */
  parent?: Comment;
  /** Derived classification (top-level comments). */
  status?: CommentStatus;
  replyMax?: number;
  /** Show the reply thread right away (capped by the caller to protect the rate limit). */
  defaultExpanded?: boolean;
}

export function CommentItem({
  post,
  comment: c,
  actions,
  parent,
  status,
  replyMax,
  defaultExpanded = false,
}: CommentItemProps) {
  const [showReplies, setShowReplies] = useState(defaultExpanded);
  // Answers sent from this app (stored locally) — private replies are invisible elsewhere.
  const history = useCommentMarks((s) => s.history[c.id]) ?? NO_HISTORY;
  const [replying, setReplying] = useState(false);
  const [busy, setBusy] = useState(false);
  const isReply = !!parent;
  // Replies load when the thread is opened (or were prefetched into the same cache).
  const replies = useReplies(post, c, !isReply && c.has_replies && showReplies);

  const caps = c.capabilities;
  const held = c.moderation_status === "held_for_review" || c.moderation_status === "likely_spam";
  const name = c.author_name || c.author_username || "Người dùng";

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cn("flex gap-3", isReply ? "pt-3" : "py-4")}>
      <ContactAvatar
        name={name}
        picture={c.author_picture || undefined}
        seed={c.author_id || c.id}
        size={isReply ? "sm" : "md"}
      />

      <div className="min-w-0 flex-1">
        <div
          className={cn(
            "inline-block max-w-full rounded-2xl bg-muted px-3.5 py-2",
            c.is_owner && "bg-primary/10",
            (c.is_hidden || held) && "border border-dashed bg-transparent",
          )}
        >
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-sm font-semibold">{name}</span>
            {c.author_username && c.author_username !== name && (
              <span className="text-xs text-muted-foreground">@{c.author_username}</span>
            )}
            {c.author_headline && (
              <span className="truncate text-xs text-muted-foreground">{c.author_headline}</span>
            )}
            {c.is_owner && (
              <span className="rounded-full bg-primary px-1.5 py-px text-[10px] font-medium text-primary-foreground">
                Trang của bạn
              </span>
            )}
            {status?.replied && !c.is_owner && (
              <StatusChip
                icon={<CheckCheck />}
                label="Đã trả lời"
                className="bg-green-500/15 text-green-700 dark:text-green-400"
              />
            )}
            {status?.privateReplied && (
              <StatusChip
                icon={<Send />}
                label="Đã nhắn riêng"
                className="bg-sky-500/15 text-sky-700 dark:text-sky-400"
              />
            )}
            {c.is_hidden && (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <EyeOff className="size-3" /> Đã ẩn
              </span>
            )}
            {held && (
              <StatusChip
                icon={<ShieldAlert />}
                label={c.moderation_status === "likely_spam" ? "Có thể là spam" : "Chờ duyệt"}
                className="bg-amber-500/15 text-amber-700 dark:text-amber-400"
              />
            )}
          </div>
          <p
            className={cn(
              "mt-0.5 text-sm leading-relaxed break-words whitespace-pre-wrap",
              (c.is_hidden || held) && "text-muted-foreground",
            )}
          >
            {c.text}
          </p>
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-0.5">
          <span className="px-1.5 text-xs text-muted-foreground" title={formatTime(c.created_at)}>
            {formatListTime(c.created_at)}
          </span>

          {held ? (
            <>
              <ActionButton
                icon={<Check />}
                label="Duyệt"
                disabled={busy}
                onClick={() => run(() => actions.onModerate(c, "published"))}
              />
              <ActionButton
                icon={<X />}
                label="Từ chối"
                danger
                disabled={busy}
                onClick={() => run(() => actions.onModerate(c, "rejected"))}
              />
            </>
          ) : (
            <>
              {caps.can_like ? (
                <ActionButton
                  icon={<Heart className={c.liked_by_viewer ? "fill-current" : undefined} />}
                  label={c.like_count > 0 ? String(c.like_count) : "Thích"}
                  active={c.liked_by_viewer}
                  onClick={() => actions.onLike(c)}
                />
              ) : (
                c.like_count > 0 && (
                  <span className="flex items-center gap-1 px-1.5 text-xs text-muted-foreground">
                    <Heart className="size-3.5" /> {c.like_count}
                  </span>
                )
              )}
              {caps.can_reply && !c.is_owner && (
                <ActionButton
                  icon={<MessageCircleReply />}
                  label="Trả lời"
                  onClick={() => setReplying((v) => !v)}
                />
              )}
              {/* One private reply per comment (platform rule) — hidden once sent. */}
              {caps.can_private_reply && !c.is_owner && !status?.privateReplied && (
                <PrivateReplyDialog
                  comment={c}
                  onSend={(text) => actions.onPrivateReply(c, text)}
                  trigger={<ActionButton icon={<Send />} label="Nhắn riêng" />}
                />
              )}
              {caps.can_hide && !c.is_owner && (
                <ActionButton
                  icon={c.is_hidden ? <Eye /> : <EyeOff />}
                  label={c.is_hidden ? "Hiện" : "Ẩn"}
                  onClick={() => actions.onHide(c)}
                />
              )}
              {caps.can_delete && (
                <ConfirmDialog
                  trigger={<ActionButton icon={<Trash2 />} label="Xoá" danger />}
                  title="Xoá bình luận?"
                  description="Bình luận sẽ bị xoá trên nền tảng, không thể hoàn tác."
                  confirmLabel="Xoá"
                  onConfirm={() => actions.onDelete(c)}
                />
              )}
            </>
          )}
          {busy && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
        </div>

        {history.length > 0 && <HandledHistory entries={history} />}

        {replying && (
          <CommentComposer
            autoFocus
            className="mt-2"
            maxLength={replyMax}
            placeholder={`Trả lời ${name}…`}
            onCancel={() => setReplying(false)}
            onSend={async (text) => {
              // One nesting level: replying to a reply answers its top-level comment.
              await actions.onReply(text, parent ?? c);
              setReplying(false);
              setShowReplies(true);
            }}
          />
        )}

        {!isReply && c.has_replies && (
          <div className="mt-1">
            <button
              type="button"
              onClick={() => setShowReplies((v) => !v)}
              className="flex items-center gap-1 px-1.5 text-xs font-medium text-primary hover:underline"
            >
              {showReplies ? (
                <ChevronUp className="size-3.5" />
              ) : (
                <ChevronDown className="size-3.5" />
              )}
              {showReplies
                ? "Ẩn trả lời"
                : replies.data
                  ? `Xem ${replies.data.length} trả lời`
                  : "Xem trả lời"}
            </button>
            {showReplies && (
              <div className="border-l-2 pl-3">
                {replies.isLoading ? (
                  <Loader2 className="my-3 size-4 animate-spin text-muted-foreground" />
                ) : (
                  replies.data?.map((r) => (
                    <CommentItem
                      key={r.id}
                      post={post}
                      comment={r}
                      parent={c}
                      actions={actions}
                      replyMax={replyMax}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

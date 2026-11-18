import { CircleAlert, Clock, ExternalLink, Loader2, Pencil, Star, UserRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { getErrorMessage } from "@/shared/api";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { cn } from "@/shared/lib/utils";
import { openExternal } from "@/shared/platform/opener";

import {
  byteLength,
  GOOGLE_REPLY_MAX_BYTES,
  useReplyToReview,
  type Review,
  type ReviewReply,
} from "./api";

const dateFmt = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function Stars({ value, size = "sm" }: { value: number; size?: "sm" | "md" }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} sao`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={cn(
            size === "sm" ? "size-3.5" : "size-4",
            i < Math.round(value) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30",
          )}
        />
      ))}
    </span>
  );
}

const STATE: Record<NonNullable<ReviewReply["state"]>, { label: string; className: string }> = {
  PENDING: {
    label: "Chờ Google duyệt",
    className: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  },
  APPROVED: {
    label: "Đã hiển thị",
    className: "bg-green-500/15 text-green-700 dark:text-green-300",
  },
  REJECTED: { label: "Google từ chối", className: "bg-destructive/15 text-destructive" },
};

/** Readable reason for a rejected Google reply. */
function violationText(v?: Record<string, unknown>) {
  const reason = typeof v?.reason === "string" ? v.reason : undefined;
  if (reason === "PROMOTIONAL_CONTENT") return "Nội dung quảng cáo (mã giảm giá, link bán hàng…).";
  return reason ?? "Vi phạm chính sách của Google.";
}

function ReplyBox({
  review,
  accountId,
  google,
  onDone,
}: {
  review: Review;
  accountId: string;
  google: boolean;
  onDone: () => void;
}) {
  const reply = useReplyToReview();
  const [text, setText] = useState(review.reply?.text ?? "");
  const bytes = byteLength(text);
  const tooLong = google && bytes > GOOGLE_REPLY_MAX_BYTES;

  const send = async () => {
    try {
      const res = await reply.mutateAsync({ reviewId: review.id, accountId, text: text.trim() });
      toast.success(
        res.state === "PENDING"
          ? "Đã gửi — Google sẽ duyệt trước khi hiển thị"
          : google
            ? "Đã gửi trả lời"
            : "Đã gửi — có thể mất tới 24 giờ để hiện trên App Store",
      );
      onDone();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
      <Textarea
        rows={3}
        autoFocus
        value={text}
        placeholder="Cảm ơn khách, phản hồi lịch sự và cụ thể…"
        onChange={(e) => setText(e.target.value)}
        className="bg-background text-sm"
      />
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {google ? (
          <span className={cn("tabular-nums", tooLong && "font-medium text-destructive")}>
            {bytes.toLocaleString("vi-VN")}/{GOOGLE_REPLY_MAX_BYTES.toLocaleString("vi-VN")} byte
          </span>
        ) : null}
        <span>
          {review.reply ? "Trả lời mới sẽ thay thế trả lời cũ · " : ""}Tốn 1 lượt tương tác
          {google && " · Không dùng mã giảm giá / link bán hàng (Google sẽ từ chối)"}
        </span>
        <div className="ml-auto flex gap-2">
          <Button variant="ghost" size="sm" onClick={onDone} disabled={reply.isPending}>
            Huỷ
          </Button>
          <Button size="sm" onClick={send} disabled={!text.trim() || tooLong || reply.isPending}>
            {reply.isPending && <Loader2 className="animate-spin" />} Gửi trả lời
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ReviewCard({
  review: r,
  accountId,
  google,
}: {
  review: Review;
  accountId: string;
  google: boolean;
}) {
  const [replying, setReplying] = useState(false);
  const [broken, setBroken] = useState(false);
  const name = r.author.name || (google ? "Người đánh giá ẩn danh" : "Người dùng App Store");
  const state = r.reply?.state ? STATE[r.reply.state] : undefined;

  return (
    <article className="space-y-3 rounded-xl border bg-card p-4">
      <header className="flex items-start gap-3">
        {r.author.avatar_url && !broken ? (
          <img
            src={r.author.avatar_url}
            alt=""
            onError={() => setBroken(true)}
            className="size-9 shrink-0 rounded-full bg-muted object-cover"
          />
        ) : (
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <UserRound className="size-4" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{name}</p>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {r.rating > 0 ? <Stars value={r.rating} /> : <span>Không chấm sao</span>}
            <span>{dateFmt.format(new Date(r.created_at))}</span>
            {r.updated_at !== r.created_at && <span>· đã sửa</span>}
          </div>
        </div>
        {!r.reply && (
          <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            Chưa trả lời
          </span>
        )}
      </header>

      {r.title && <p className="text-sm font-semibold">{r.title}</p>}
      {r.text ? (
        <p className="text-sm whitespace-pre-wrap">{r.text}</p>
      ) : (
        <p className="text-sm text-muted-foreground italic">(chỉ chấm sao, không viết nội dung)</p>
      )}

      {!!r.media?.length && (
        <div className="flex flex-wrap gap-2">
          {r.media.map((m) => (
            <button
              key={m.thumbnail_url}
              type="button"
              onClick={() => openExternal(m.video_url ?? m.thumbnail_url)}
              title={m.thumbnail_label}
              className="size-16 overflow-hidden rounded-md border bg-muted"
            >
              <img
                src={m.thumbnail_url}
                alt={m.thumbnail_label ?? ""}
                className="size-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {r.reply && !replying && (
        <div className="space-y-1.5 rounded-lg border-l-2 border-primary/50 bg-muted/40 px-3 py-2">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-medium">Trả lời của bạn</span>
            {state && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5",
                  state.className,
                )}
              >
                {r.reply.state === "PENDING" && <Clock className="size-3" />}
                {r.reply.state === "REJECTED" && <CircleAlert className="size-3" />}
                {state.label}
              </span>
            )}
            <span className="text-muted-foreground">
              {dateFmt.format(new Date(r.reply.updated_at))}
            </span>
          </div>
          <p className="text-sm whitespace-pre-wrap">{r.reply.text}</p>
          {r.reply.state === "REJECTED" && (
            <p className="text-xs text-destructive">
              Lý do: {violationText(r.reply.policy_violation)} Hãy viết lại và gửi trả lời mới.
            </p>
          )}
        </div>
      )}

      {replying ? (
        <ReplyBox
          review={r}
          accountId={accountId}
          google={google}
          onDone={() => setReplying(false)}
        />
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button
            variant={r.reply ? "ghost" : "outline"}
            size="sm"
            onClick={() => setReplying(true)}
          >
            <Pencil /> {r.reply ? "Viết lại trả lời" : "Trả lời"}
          </Button>
          {r.reply_url && (
            <Button variant="ghost" size="sm" onClick={() => openExternal(r.reply_url!)}>
              <ExternalLink /> Xem trên Google
            </Button>
          )}
        </div>
      )}
    </article>
  );
}

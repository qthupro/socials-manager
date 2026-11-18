import { ExternalLink, Loader2, MessageSquareReply, UserRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { getErrorMessage } from "@/shared/api";
import { PlatformIcon } from "@/shared/components/platform-icon";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { openExternal } from "@/shared/platform/opener";

import { canReplyToMentions, mentionLink, useReplyToMention, type Mention } from "./api";

const dateTime = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const MENTION_TYPE: Record<string, string> = {
  caption: "Trong bài viết",
  post: "Trong bài viết",
  comment: "Trong bình luận",
};

export function MentionCard({
  mention: m,
  accountId,
  replied,
  onReplied,
}: {
  mention: Mention;
  accountId: string;
  /** Replied from this app in this session (the API has no replied flag). */
  replied: boolean;
  onReplied: () => void;
}) {
  const reply = useReplyToMention();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [broken, setBroken] = useState(false);
  const link = mentionLink(m);
  const kind =
    typeof m.metadata?.mention_type === "string"
      ? MENTION_TYPE[m.metadata.mention_type]
      : undefined;
  const name = m.author.name || (m.author.username ? `@${m.author.username}` : "Người dùng");

  const send = async () => {
    try {
      await reply.mutateAsync({ accountId, mention: m, text: text.trim() });
      toast.success("Đã trả lời (bình luận công khai)");
      setOpen(false);
      setText("");
      onReplied();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <article className="space-y-3 rounded-xl border bg-card p-4">
      <header className="flex items-start gap-3">
        {m.author.avatar_url && !broken ? (
          <img
            src={m.author.avatar_url}
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
          <p className="truncate text-sm font-medium">
            {name}
            {m.author.name && m.author.username && (
              <span className="ml-1.5 font-normal text-muted-foreground">@{m.author.username}</span>
            )}
          </p>
          <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <PlatformIcon platform={m.platform} size="sm" className="size-3.5 [&_svg]:size-2" />
            {dateTime.format(new Date(m.received_at))}
            {kind && <span>· {kind}</span>}
          </p>
        </div>
        {replied && (
          <span className="shrink-0 rounded-full bg-green-500/15 px-2 py-0.5 text-xs text-green-700 dark:text-green-300">
            Đã trả lời
          </span>
        )}
      </header>

      {m.content.text ? (
        <p className="text-sm whitespace-pre-wrap">{m.content.text}</p>
      ) : (
        <p className="text-sm text-muted-foreground italic">(không có chữ)</p>
      )}

      {!!m.content.media?.length && (
        <div className="flex flex-wrap gap-2">
          {m.content.media.map((md) =>
            md.type === "video" ? (
              <button
                key={md.url}
                type="button"
                onClick={() => openExternal(md.url)}
                className="flex size-20 items-center justify-center rounded-md border bg-muted text-xs text-muted-foreground"
              >
                Video
              </button>
            ) : (
              <img
                key={md.url}
                src={md.url}
                alt=""
                loading="lazy"
                className="size-20 rounded-md border bg-muted object-cover"
              />
            ),
          )}
        </div>
      )}

      {open ? (
        <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
          <Textarea
            rows={2}
            autoFocus
            value={text}
            placeholder="Trả lời công khai dưới bài / bình luận…"
            onChange={(e) => setText(e.target.value)}
            className="bg-background text-sm"
          />
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Đăng thành bình luận công khai · tốn 1 lượt tương tác</span>
            <div className="ml-auto flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setOpen(false)}
                disabled={reply.isPending}
              >
                Huỷ
              </Button>
              <Button size="sm" onClick={send} disabled={!text.trim() || reply.isPending}>
                {reply.isPending && <Loader2 className="animate-spin" />} Gửi
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {canReplyToMentions(m.platform) ? (
            <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
              <MessageSquareReply /> Trả lời
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">
              X không hỗ trợ trả lời lượt nhắc qua API.
            </span>
          )}
          {link && (
            <Button variant="ghost" size="sm" onClick={() => openExternal(link)}>
              <ExternalLink /> Xem bài gốc
            </Button>
          )}
        </div>
      )}
    </article>
  );
}

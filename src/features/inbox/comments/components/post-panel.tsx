import { ExternalLink, Info, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { getErrorMessage } from "@/shared/api";
import { ErrorState } from "@/shared/components/state-views";
import { Button } from "@/shared/components/ui/button";
import { getPlatform } from "@/shared/config/platforms";
import { cn } from "@/shared/lib/utils";
import { openExternal } from "@/shared/platform/opener";

import { formatDayLabel, formatTime } from "../../messages/lib/format";
import { useCommentActions } from "../api/actions";
import { useComments, useRepliesMap } from "../api/queries";
import { YOUTUBE_DAILY_REPLIES } from "../constants";
import { replyMaxFor } from "../lib/platforms";
import { commentStatus, matchesFilter, type CommentFilter } from "../lib/status";
import { useCommentMarks } from "../store/marks-store";
import type { InboxPost } from "../types";
import { CommentComposer } from "./comment-composer";
import { CommentItem, type CommentActions } from "./comment-item";
import { PostMetricsBar } from "./post-metrics";
import { PostThumb } from "./post-list";

/** Comments whose replies are shown without clicking. */
const EXPANDED_THREADS = 15;

const TABS: { value: CommentFilter; label: string; youtubeOnly?: boolean }[] = [
  { value: "all", label: "Tất cả" },
  { value: "unanswered", label: "Chưa trả lời" },
  { value: "answered", label: "Đã trả lời" },
  { value: "private", label: "Đã nhắn riêng" },
  { value: "hidden", label: "Đã ẩn" },
  { value: "held", label: "Chờ duyệt", youtubeOnly: true },
];

/** Shows the API error as a toast, then re-throws so the UI keeps its state. */
function withToast<A extends unknown[]>(fn: (...args: A) => Promise<unknown>, done?: string) {
  return async (...args: A) => {
    try {
      await fn(...args);
      if (done) toast.success(done);
    } catch (err) {
      toast.error(getErrorMessage(err));
      throw err;
    }
  };
}

export function PostPanel({ post, sourceName }: { post: InboxPost; sourceName?: string }) {
  const platform = getPlatform(post.platform);
  const isYoutube = platform?.slug === "youtube";
  const replyMax = replyMaxFor(post.platform);
  const marks = useCommentMarks();
  const [tab, setTab] = useState<CommentFilter>("unanswered");

  const thread = useComments(post);
  const replies = useRepliesMap(post, thread.comments);
  const api = useCommentActions(post);

  const actions: CommentActions = {
    onLike: withToast(api.like),
    onHide: withToast(api.hide),
    onDelete: withToast(api.remove, "Đã xoá bình luận"),
    onReply: withToast((text: string, parent) => api.reply(text, parent), "Đã trả lời"),
    onModerate: withToast(api.moderate, "Đã cập nhật trạng thái duyệt"),
    onPrivateReply: withToast(api.privateReply),
  };

  const withStatus = thread.comments.map((c) => ({ c, s: commentStatus(c, replies[c.id], marks) }));
  const count = (f: CommentFilter) =>
    withStatus.filter(({ c, s }) => matchesFilter(c, s, f)).length;
  const visible = withStatus.filter(({ c, s }) => matchesFilter(c, s, tab));
  const tabs = TABS.filter((t) => !t.youtubeOnly || isYoutube);

  return (
    <section className="flex min-w-0 flex-1 flex-col bg-background">
      {/* Post */}
      <header className="flex shrink-0 gap-4 border-b p-4">
        <PostThumb post={post} className="size-20" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="text-xs text-muted-foreground">
            {platform?.label}
            {sourceName && <> · {sourceName}</>}
            {post.published_at && (
              <>
                {" "}
                · {formatDayLabel(post.published_at)} {formatTime(post.published_at)}
              </>
            )}
          </p>
          <p className="line-clamp-3 text-sm">
            {post.content || <span className="text-muted-foreground">(Không có nội dung)</span>}
          </p>
          <PostMetricsBar post={post} />
        </div>
        {post.permalink && (
          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => openExternal(post.permalink!)}
          >
            <ExternalLink /> Mở bài viết
          </Button>
        )}
      </header>

      {/* Classification tabs */}
      <div className="flex shrink-0 flex-wrap items-center gap-1 border-b px-4 py-2">
        {tabs.map((t) => {
          const n = count(t.value);
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => setTab(t.value)}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted",
                tab === t.value && "bg-muted text-foreground",
              )}
            >
              {t.label}
              {n > 0 && (
                <span
                  className={cn(
                    "rounded-full px-1.5 text-[10px] tabular-nums",
                    t.value === "unanswered" || t.value === "held"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted-foreground/15",
                  )}
                >
                  {n}
                </span>
              )}
            </button>
          );
        })}
        {isYoutube && (
          <span className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground">
            <Info className="size-3" /> YouTube: tối đa {YOUTUBE_DAILY_REPLIES} trả lời / ngày
          </span>
        )}
      </div>

      {/* Comments */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4">
        {thread.isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : thread.error ? (
          <div className="py-6">
            <ErrorState error={thread.error} onRetry={() => thread.refetch()} />
          </div>
        ) : visible.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            {tab === "unanswered" && thread.comments.length > 0
              ? "Đã trả lời hết bình luận 🎉"
              : "Không có bình luận nào."}
          </p>
        ) : (
          <div className="divide-y">
            {visible.map(({ c, s }, i) => (
              <CommentItem
                key={c.id}
                post={post}
                comment={c}
                status={s}
                actions={actions}
                replyMax={replyMax}
                // Threads open by default for the first comments (each costs a request).
                defaultExpanded={i < EXPANDED_THREADS}
              />
            ))}
          </div>
        )}
        {thread.hasMore && (
          <div className="flex justify-center py-3">
            <Button
              variant="outline"
              size="sm"
              disabled={thread.loadingMore}
              onClick={thread.loadMore}
            >
              {thread.loadingMore && <Loader2 className="animate-spin" />}
              Tải thêm bình luận
            </Button>
          </div>
        )}
      </div>

      <div className="shrink-0 border-t p-3">
        <CommentComposer
          placeholder="Viết bình luận dưới bài viết…"
          maxLength={replyMax}
          onSend={withToast((text: string) => api.reply(text), "Đã bình luận")}
        />
      </div>
    </section>
  );
}

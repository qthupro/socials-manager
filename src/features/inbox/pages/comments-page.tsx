import { useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { MessagesSquare, Plug } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router";

import { useAccounts } from "@/features/connections";
import { EmptyState, ErrorState, RequireApiKey } from "@/shared/components/state-views";
import { Button } from "@/shared/components/ui/button";

import { commentKeys } from "../comments/api/keys";
import { useCommentPosts } from "../comments/api/queries";
import { PostList } from "../comments/components/post-list";
import { PostPanel } from "../comments/components/post-panel";
import { ALL_SOURCES } from "../comments/constants";
import { canListComments } from "../comments/lib/platforms";
import { countUnanswered } from "../comments/lib/status";
import { useCommentMarks } from "../comments/store/marks-store";
import type { Comment, CommentPage, InboxPost } from "../comments/types";
import { useInboxSources } from "../messages/lib/sources";

function CommentsContent() {
  const qc = useQueryClient();
  const accounts = useAccounts();
  const marks = useCommentMarks();

  const [sourceKey, setSourceKey] = useState(ALL_SOURCES);
  const [query, setQuery] = useState("");
  const [withComments, setWithComments] = useState(true);
  const [selected, setSelected] = useState<InboxPost>();

  const commentAccounts = useMemo(
    () => (accounts.data ?? []).filter(canListComments),
    [accounts.data],
  );
  const { sources, sourceOf } = useInboxSources(commentAccounts);
  const source = sources.find((s) => s.key === sourceKey);

  const list = useCommentPosts({
    accountId: source?.accountId,
    pageId: source?.pageId,
    withComments,
  });

  const posts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return list.posts.filter((p) => !q || (p.content ?? "").toLowerCase().includes(q));
  }, [list.posts, query]);

  // Freshest copy of the open post (counts change while polling).
  const current = selected ? (list.posts.find((p) => p.id === selected.id) ?? selected) : undefined;

  /** Unanswered count from cached comments (only posts that have been opened). */
  const unanswered = (postId: string) => {
    const cached = qc.getQueryData<InfiniteData<CommentPage<Comment>>>([
      ...commentKeys.list(postId),
      "published",
    ]);
    if (!cached) return undefined;
    const comments = cached.pages.flatMap((p) => p.data ?? []);
    const replies: Record<string, Comment[]> = {};
    for (const c of comments) {
      const r = qc.getQueryData<Comment[]>(commentKeys.replies(postId, c.id));
      if (r) replies[c.id] = r;
    }
    return countUnanswered(comments, replies, marks);
  };

  if (accounts.isLoading) return null;
  if (accounts.error) {
    return (
      <div className="p-4">
        <ErrorState error={accounts.error} onRetry={() => accounts.refetch()} />
      </div>
    );
  }
  if (commentAccounts.length === 0) {
    return (
      <div className="p-4">
        <EmptyState
          icon={Plug}
          title="Chưa có tài khoản hỗ trợ bình luận"
          description="Kết nối Facebook Page, Instagram, Threads, TikTok, YouTube, X, Bluesky hoặc LinkedIn Company Page."
          action={
            <Button asChild size="sm">
              <Link to="/accounts">Kết nối tài khoản</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <PostList
        posts={posts}
        loading={list.isLoading}
        selectedId={current?.id}
        onSelect={setSelected}
        sources={sources}
        sourceKey={sourceKey}
        onSourceChange={setSourceKey}
        sourceOf={sourceOf}
        query={query}
        onQueryChange={setQuery}
        withComments={withComments}
        onWithCommentsChange={setWithComments}
        unanswered={unanswered}
        hasMore={!!list.hasNextPage}
        loadingMore={list.isFetchingNextPage}
        onLoadMore={() => list.fetchNextPage()}
      />

      {list.error ? (
        <div className="flex-1 p-4">
          <ErrorState error={list.error} onRetry={() => list.refetch()} />
        </div>
      ) : current ? (
        <PostPanel key={current.id} post={current} sourceName={sourceOf(current)?.name} />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-muted/20 text-center">
          <div className="rounded-2xl bg-primary/10 p-4 text-primary">
            <MessagesSquare className="size-8" />
          </div>
          <p className="font-medium">Chọn một bài viết để xem bình luận</p>
        </div>
      )}
    </div>
  );
}

/**
 * Comments inbox (SocialAPI /inbox/comments). Polled — X, YouTube, Bluesky and LinkedIn
 * send no comment webhooks; with realtime on, Instagram / Facebook / Threads / TikTok
 * comments refresh on the comment.received event.
 */
export function CommentsPage() {
  return (
    <RequireApiKey>
      <CommentsContent />
    </RequireApiKey>
  );
}

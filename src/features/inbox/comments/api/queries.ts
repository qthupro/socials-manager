import { useInfiniteQuery, useQueries, useQuery } from "@tanstack/react-query";

import { api, toQuery } from "@/shared/api";
import { useIsRealtimeOnline } from "@/shared/realtime";

import type { Comment, CommentPage, InboxPost, PostMetricsTarget } from "../types";
import { commentKeys, type PostFilters } from "./keys";
import { postPath } from "./paths";

/** X / YouTube / Bluesky / LinkedIn send no comment webhooks — poll; back off with realtime on. */
const POSTS_POLL = 60_000;
const COMMENTS_POLL = 30_000;
const REALTIME_FACTOR = 3;

const nextCursor = (last: CommentPage<unknown>) =>
  last.pagination.has_more && last.pagination.next_cursor ? last.pagination.next_cursor : undefined;

/** GET /inbox/comments — posts with their comment counts, newest first. */
export function useCommentPosts(filters: PostFilters) {
  const realtime = useIsRealtimeOnline();
  const query = useInfiniteQuery({
    queryKey: commentKeys.posts(filters),
    queryFn: ({ pageParam }) =>
      api.get<CommentPage<InboxPost>>(
        `/inbox/comments${toQuery({
          account_id: filters.accountId,
          page_id: filters.pageId,
          min_comments: filters.withComments ? 1 : undefined,
          limit: 25,
          cursor: pageParam,
        })}`,
      ),
    initialPageParam: "",
    getNextPageParam: nextCursor,
    refetchInterval: realtime ? POSTS_POLL * REALTIME_FACTOR : POSTS_POLL,
  });
  return { ...query, posts: (query.data?.pages ?? []).flatMap((p) => p.data ?? []) };
}

function commentsQuery(post: InboxPost, moderation?: "held_for_review" | "likely_spam") {
  return {
    queryKey: [...commentKeys.list(post.id), moderation ?? "published"],
    queryFn: ({ pageParam }: { pageParam: string }) =>
      api.get<CommentPage<Comment>>(
        `/inbox/comments/${postPath(post)}${toQuery({
          account_id: post.account_id,
          limit: post.platform === "tiktok" ? 30 : 100,
          moderation_status: moderation,
          cursor: pageParam,
        })}`,
      ),
    initialPageParam: "",
    getNextPageParam: nextCursor,
  };
}

/**
 * GET /inbox/comments/{post_id} — top-level comments with capabilities.
 * YouTube also loads its moderation queues (held for review, likely spam).
 */
export function useComments(post: InboxPost | undefined) {
  const realtime = useIsRealtimeOnline();
  const refetchInterval = realtime ? COMMENTS_POLL * REALTIME_FACTOR : COMMENTS_POLL;
  const isYoutube = post?.platform === "youtube";

  const main = useInfiniteQuery({
    ...commentsQuery(post!),
    enabled: !!post,
    refetchInterval,
  });
  const held = useInfiniteQuery({
    ...commentsQuery(post!, "held_for_review"),
    enabled: !!post && isYoutube,
    refetchInterval,
  });
  const spam = useInfiniteQuery({
    ...commentsQuery(post!, "likely_spam"),
    enabled: !!post && isYoutube,
    refetchInterval,
  });

  const flat = (q: typeof main) => (q.data?.pages ?? []).flatMap((p) => p.data ?? []);
  const comments = [...flat(main), ...(isYoutube ? [...flat(held), ...flat(spam)] : [])];

  return {
    comments,
    isLoading: main.isLoading,
    error: main.error,
    refetch: main.refetch,
    hasMore: !!main.hasNextPage,
    loadMore: () => main.fetchNextPage(),
    loadingMore: main.isFetchingNextPage,
  };
}

function repliesQuery(post: InboxPost, comment: Comment) {
  return {
    queryKey: commentKeys.replies(post.id, comment.id),
    queryFn: async () =>
      (
        await api.get<CommentPage<Comment>>(
          `/inbox/comments/${postPath(post)}/${encodeURIComponent(comment.id)}/replies${toQuery({
            account_id: post.account_id,
            limit: post.platform === "tiktok" ? 30 : 100,
          })}`,
        )
      ).data ?? [],
    staleTime: 60_000,
  };
}

/** GET …/{comment_id}/replies, loaded when a thread is expanded. */
export function useReplies(post: InboxPost, comment: Comment, enabled: boolean) {
  return useQuery({ ...repliesQuery(post, comment), enabled });
}

/** Max threads whose replies are fetched up front (to spot our own answers). */
const PREFETCH_REPLIES = 10;

/**
 * Replies of the first comments that have any — enough to tell "answered" from
 * "unanswered" (an owner reply underneath). Capped to protect the rate limit.
 */
export function useRepliesMap(post: InboxPost | undefined, comments: Comment[]) {
  const targets = post ? comments.filter((c) => c.has_replies).slice(0, PREFETCH_REPLIES) : [];
  return useQueries({
    queries: targets.map((c) => repliesQuery(post!, c)),
    combine: (results) => {
      const map: Record<string, Comment[]> = {};
      results.forEach((r, i) => {
        if (r.data) map[targets[i].id] = r.data;
      });
      return map;
    },
  });
}

/** Live metrics for the post (free). Targets carry their own `error` when unsupported. */
export function usePostMetrics(post: InboxPost | undefined) {
  return useQuery({
    queryKey: commentKeys.metrics(post?.id ?? ""),
    queryFn: async () =>
      (
        await api.get<{ data: { post_id: string; targets: PostMetricsTarget[] } }>(
          `/posts/${postPath(post!)}/metrics`,
        )
      ).data.targets,
    enabled: !!post,
    staleTime: 5 * 60_000,
    retry: false,
  });
}

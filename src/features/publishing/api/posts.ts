/** React Query hooks for /posts (docs: api-reference/posts). */
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { api } from "@/shared/api";
import { onRealtimeEvent } from "@/shared/realtime";

import { postsBackend } from "./backend";
import type {
  CreatePostRequest,
  Post,
  PostListParams,
  PostTarget,
  UpdatePostRequest,
} from "./types";

export const postKeys = {
  all: ["posts"] as const,
  list: (params: PostListParams) => ["posts", "list", params] as const,
  detail: (id: string) => ["posts", "detail", id] as const,
};

/** Delivery is async: poll while something is still publishing. */
const PUBLISHING_POLL_MS = 5000;
const PAGE_SIZE = 50;
const isPublishing = (p: Post) => p.status === "publishing";

/** Cursor-paginated GET /posts; `posts` is every loaded page, flattened. */
export function usePosts(params: Omit<PostListParams, "cursor" | "limit">) {
  usePostEvents();
  const query = useInfiniteQuery({
    queryKey: postKeys.list(params),
    queryFn: ({ pageParam }) =>
      postsBackend.list({ ...params, limit: PAGE_SIZE, cursor: pageParam || undefined }),
    initialPageParam: "",
    getNextPageParam: (last) =>
      last.pagination.has_more && last.pagination.next_cursor
        ? last.pagination.next_cursor
        : undefined,
    refetchInterval: (q) =>
      q.state.data?.pages.some((p) => p.data?.some(isPublishing)) ? PUBLISHING_POLL_MS : false,
  });
  const posts = query.data?.pages.flatMap((p) => p.data ?? []);
  return { ...query, posts };
}

const RANGE_PAGE_SIZE = 100;
/** Safety cap for one calendar range (10 × 100 posts). */
const RANGE_MAX_PAGES = 10;

/**
 * Every post between `from` and `to` (RFC 3339, inclusive) — the API matches publish time,
 * else scheduled time, else creation time. Walks all pages; used by the calendar.
 */
export function usePostsInRange(params: { from: string; to: string; brand_id?: string }) {
  usePostEvents();
  return useQuery({
    queryKey: [...postKeys.all, "range", params] as const,
    queryFn: async () => {
      const all: Post[] = [];
      let cursor: string | undefined;
      for (let i = 0; i < RANGE_MAX_PAGES; i++) {
        const page = await postsBackend.list({
          ...params,
          sort: "scheduled_asc",
          limit: RANGE_PAGE_SIZE,
          cursor,
        });
        all.push(...(page.data ?? []));
        if (!page.pagination.has_more || !page.pagination.next_cursor) break;
        cursor = page.pagination.next_cursor;
      }
      return all;
    },
    refetchInterval: (q) => (q.state.data?.some(isPublishing) ? PUBLISHING_POLL_MS : false),
  });
}

/**
 * GET /posts/{id}/metrics — live read from the platforms for published targets; the
 * figures are written back onto the post (metrics_synced_at). 200 even when a target
 * fails: each target carries metrics or error. LinkedIn / Pinterest: not supported.
 */
export function useRefreshPostMetrics() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.get<{ data: { post_id: string; targets: PostTarget[] | null } }>(
        `/posts/${encodeURIComponent(id)}/metrics`,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: postKeys.all }),
  });
}

/** Delivery results arrive as webhooks in realtime mode: refresh right away. */
function usePostEvents() {
  const qc = useQueryClient();
  useEffect(
    () =>
      onRealtimeEvent((e) => {
        if (e.event.startsWith("post.")) qc.invalidateQueries({ queryKey: postKeys.all });
      }),
    [qc],
  );
}

export function usePost(id: string | undefined) {
  return useQuery({
    queryKey: postKeys.detail(id ?? ""),
    queryFn: () => postsBackend.get(id!),
    enabled: !!id,
    refetchInterval: (q) =>
      q.state.data && isPublishing(q.state.data) ? PUBLISHING_POLL_MS : false,
  });
}

function useInvalidatingMutation<TArgs, TResult>(fn: (args: TArgs) => Promise<TResult>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: postKeys.all }),
  });
}

export const useCreatePost = () =>
  useInvalidatingMutation((body: CreatePostRequest) => postsBackend.create(body));

export const useUpdatePost = () =>
  useInvalidatingMutation(({ id, body }: { id: string; body: UpdatePostRequest }) =>
    postsBackend.update(id, body),
  );

export const useDeletePost = () => useInvalidatingMutation((id: string) => postsBackend.remove(id));

export const usePublishPost = () =>
  useInvalidatingMutation((id: string) => postsBackend.publish(id));

export const useRetryPost = () => useInvalidatingMutation((id: string) => postsBackend.retry(id));

export const useUnpublishPost = () =>
  useInvalidatingMutation(({ id, accountId }: { id: string; accountId?: string }) =>
    postsBackend.unpublish(id, accountId),
  );

/**
 * Reviews (docs: guides/reviews, api-reference/inbox-reviews/*). Only Google Business
 * Profile and App Store Connect have reviews. One business reply per review — a new
 * reply replaces it; there is no delete / edit endpoint. A reply costs 1 interaction.
 */
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { api, toQuery } from "@/shared/api";
import { onRealtimeEvent } from "@/shared/realtime";

export interface ReviewAccount {
  account_id: string;
  name: string;
  platform: string;
  status: "ok" | "reconnection_required" | "error";
  /** null unless status is ok; App Store Connect always 0. */
  average_rating: number | null;
  total_count: number | null;
  last_review_at: string | null;
}

export interface ReviewReply {
  text: string;
  updated_at: string;
  /** Google only: a reply is public once APPROVED. */
  state?: "PENDING" | "APPROVED" | "REJECTED";
  /** Google, on a rejected reply (e.g. { reason: "PROMOTIONAL_CONTENT" }). */
  policy_violation?: Record<string, unknown>;
}

export interface Review {
  /** sapi_rev_… */
  id: string;
  /** 1–5, or 0 when Google gave no rating. */
  rating: number;
  /** Empty for a rating-only review. */
  text: string;
  /** App Store Connect headline. */
  title?: string;
  author: { id?: string; name?: string; username?: string; avatar_url?: string };
  media?: { thumbnail_url: string; thumbnail_label?: string; video_url?: string }[];
  reply: ReviewReply | null;
  /** Google-hosted reply page. */
  reply_url?: string;
  created_at: string;
  updated_at: string;
}

export type ReviewOrder = "newest" | "rating_asc" | "rating_desc";

interface ReviewsPage {
  data: Review[] | null;
  /** Whole location / app, not this page. */
  summary: { average_rating: number; total_count: number };
  pagination: { has_more: boolean; next_cursor: string };
}

export const reviewKeys = {
  all: ["reviews"] as const,
  accounts: ["reviews", "accounts"] as const,
  list: (accountId: string, order: ReviewOrder) => ["reviews", "list", accountId, order] as const,
};

/** Google can miss notifications: the docs advise reading on a schedule. */
const POLL_MS = 5 * 60_000;
const PAGE_SIZE = 50;

/** GET /inbox/reviews — review-capable accounts with a live summary (not paginated). */
export function useReviewAccounts() {
  return useQuery({
    queryKey: reviewKeys.accounts,
    queryFn: async () =>
      (await api.get<{ data: ReviewAccount[] | null }>("/inbox/reviews")).data ?? [],
    refetchInterval: POLL_MS,
  });
}

/** GET /inbox/reviews/{account_id} — cursor-paginated, with the account summary. */
export function useReviews(accountId: string | undefined, order: ReviewOrder) {
  const query = useInfiniteQuery({
    queryKey: reviewKeys.list(accountId ?? "", order),
    queryFn: ({ pageParam }) =>
      api.get<ReviewsPage>(
        `/inbox/reviews/${encodeURIComponent(accountId!)}${toQuery({
          limit: PAGE_SIZE,
          order,
          cursor: pageParam || undefined,
        })}`,
      ),
    initialPageParam: "",
    getNextPageParam: (last) =>
      last.pagination.has_more && last.pagination.next_cursor
        ? last.pagination.next_cursor
        : undefined,
    enabled: !!accountId,
    refetchInterval: POLL_MS,
  });
  const pages = query.data?.pages ?? [];
  return {
    ...query,
    reviews: pages.flatMap((p) => p.data ?? []),
    summary: pages[0]?.summary,
  };
}

/** POST /inbox/reviews/{review_id}/reply — replaces any existing reply. */
export function useReplyToReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      reviewId,
      accountId,
      text,
    }: {
      reviewId: string;
      accountId: string;
      text: string;
    }) =>
      api.post<{ success: boolean; reply_id: string; state?: string }>(
        `/inbox/reviews/${encodeURIComponent(reviewId)}/reply`,
        { account_id: accountId, text },
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: reviewKeys.all }),
  });
}

/** review.received / review.updated (Google only) → refresh. */
export function useReviewEvents() {
  const qc = useQueryClient();
  useEffect(
    () =>
      onRealtimeEvent((e) => {
        if (e.event.startsWith("review.")) qc.invalidateQueries({ queryKey: reviewKeys.all });
      }),
    [qc],
  );
}

/** Google's reply limit (bytes, UTF-8). App Store Connect sets none on SocialAPI's side. */
export const GOOGLE_REPLY_MAX_BYTES = 4096;
export const byteLength = (s: string) => new TextEncoder().encode(s).length;

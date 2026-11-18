/**
 * Mentions (docs: guides/mentions, api-reference/mentions/*). Listed per account,
 * newest first. Replying posts a public comment and costs 1 interaction.
 */
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import type { SocialAccount } from "@/features/connections";
import { api, toQuery } from "@/shared/api";
import { getPlatform } from "@/shared/config/platforms";
import { onRealtimeEvent } from "@/shared/realtime";

export interface Mention {
  /** sapi_mnt_… */
  id: string;
  platform: string;
  type: "mention";
  account_id: string;
  author: { id?: string; name?: string; username?: string; avatar_url?: string };
  content: { text: string; media?: { type: string; url: string }[] };
  /** Platform-specific: Instagram permalink / media_type / like_count…, Facebook permalink_url, mention_type. */
  metadata: Record<string, unknown> | null;
  received_at: string;
  post_id?: string;
  platform_post_id?: string;
  /** Threads and TikTok. */
  permalink?: string;
  /** Facebook. */
  page_id?: string;
}

interface MentionsPage {
  data: Mention[] | null;
  count: number;
  next_cursor?: string;
}

export const mentionKeys = {
  all: ["mentions"] as const,
  list: (accountId: string) => ["mentions", accountId] as const,
};

const PAGE_SIZE = 50;
/** TikTok asks apps to read mentions once per account per day (data lags 24–48h). */
const TIKTOK_STALE_MS = 6 * 60 * 60_000;
const STALE_MS = 5 * 60_000;

/** Platforms whose mentions SocialAPI lists (others → 501). LinkedIn: company Pages only. */
export function mentionsSupported(a: SocialAccount) {
  const slug = getPlatform(a.platform)?.slug;
  if (slug === "linkedin") return a.connection_type === "organization";
  return ["instagram", "facebook", "threads", "tiktok", "twitter", "bluesky"].includes(slug ?? "");
}

/** X lists mentions but can't reply (501). */
export const canReplyToMentions = (platform: string) => getPlatform(platform)?.slug !== "twitter";

/** Link to the mention on its platform, wherever the platform puts it. */
export function mentionLink(m: Mention): string | undefined {
  const md = m.metadata ?? {};
  const pick = (v: unknown) => (typeof v === "string" && v ? v : undefined);
  return m.permalink || pick(md.permalink) || pick(md.permalink_url);
}

/**
 * GET /accounts/{id}/mentions. Not polled: every list call that returns items makes
 * SocialAPI send a mention.received webhook (array form) — see useMentionEvents.
 */
export function useMentions(account: SocialAccount | undefined) {
  const tiktok = getPlatform(account?.platform ?? "")?.slug === "tiktok";
  const query = useInfiniteQuery({
    queryKey: mentionKeys.list(account?.id ?? ""),
    queryFn: ({ pageParam }) =>
      api.get<MentionsPage>(
        `/accounts/${encodeURIComponent(account!.id)}/mentions${toQuery({
          limit: PAGE_SIZE,
          cursor: pageParam || undefined,
        })}`,
      ),
    initialPageParam: "",
    // Threads ignores cursor and returns a single page.
    getNextPageParam: (last) => last.next_cursor || undefined,
    enabled: !!account,
    staleTime: tiktok ? TIKTOK_STALE_MS : STALE_MS,
    refetchOnWindowFocus: false,
  });
  return { ...query, mentions: query.data?.pages.flatMap((p) => p.data ?? []) ?? [] };
}

/** POST /accounts/{id}/mentions/reply → { success, comment_id }. */
export function useReplyToMention() {
  return useMutation({
    mutationFn: ({
      accountId,
      mention,
      text,
    }: {
      accountId: string;
      mention: Mention;
      text: string;
    }) =>
      api.post<{ success: boolean; comment_id: string }>(
        `/accounts/${encodeURIComponent(accountId)}/mentions/reply`,
        // The sapi_mnt_ id identifies the post (and, on TikTok, the comment).
        { media_id: mention.id, text },
      ),
  });
}

/**
 * mention.received arrives in two forms: a single object when the PLATFORM pushes a new
 * mention, and an array echoing the items of every list call we make. Only the object
 * form means something new — refetching on the array form would loop forever.
 */
export function useMentionEvents() {
  const qc = useQueryClient();
  useEffect(
    () =>
      onRealtimeEvent((e) => {
        if (e.event !== "mention.received") return;
        const data = e.body.data;
        if (!data || Array.isArray(data)) return;
        qc.invalidateQueries({ queryKey: mentionKeys.all });
      }),
    [qc],
  );
}

import {
  useInfiniteQuery,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { api, toQuery } from "@/shared/api";
import { useIsRealtimeOnline } from "@/shared/realtime";

import type { Conversation, InboxPage } from "../types";
import { inboxKeys, type ConversationFilters } from "./keys";

/** Polling interval; webhooks (realtime mode) refresh on demand, so polling backs off. */
const POLL_MS = 20_000;
const POLL_REALTIME_MS = 120_000;
const PAGE_SIZE = 50;

/** GET /inbox/conversations — most recent activity first, cursor-paginated. */
export function useConversations(filters: ConversationFilters) {
  const realtime = useIsRealtimeOnline();
  return useInfiniteQuery({
    queryKey: inboxKeys.conversations(filters),
    queryFn: ({ pageParam }) =>
      api.get<InboxPage<Conversation>>(
        `/inbox/conversations${toQuery({
          account_id: filters.accountId,
          page_id: filters.pageId,
          status: filters.status,
          limit: PAGE_SIZE,
          cursor: pageParam,
        })}`,
      ),
    initialPageParam: "",
    getNextPageParam: (last) =>
      last.pagination.has_more && last.pagination.next_cursor
        ? last.pagination.next_cursor
        : undefined,
    refetchInterval: realtime ? POLL_REALTIME_MS : POLL_MS,
  });
}

/**
 * GET /inbox/conversations/{id} — for a conversation that isn't in the loaded list
 * (opened from a notification, on a later page, or archived).
 */
export function useConversation(id: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: [...inboxKeys.conversationsAll, "one", id ?? ""],
    queryFn: async () =>
      (await api.get<{ data: Conversation }>(`/inbox/conversations/${encodeURIComponent(id!)}`))
        .data,
    enabled: enabled && !!id,
  });
}

/** Several conversations by id (same cache entries as useConversation); 404s are dropped. */
export function useConversationsById(ids: string[]) {
  return useQueries({
    queries: ids.map((id) => ({
      queryKey: [...inboxKeys.conversationsAll, "one", id],
      queryFn: async () =>
        (await api.get<{ data: Conversation }>(`/inbox/conversations/${encodeURIComponent(id)}`))
          .data,
      retry: false,
    })),
    combine: (results) => ({
      data: results.flatMap((r) => (r.data ? [r.data] : [])),
      isLoading: results.some((r) => r.isLoading),
    }),
  });
}

/** POST /inbox/conversations/{id}/read — resets unread_count (the contact sees nothing). */
export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string) =>
      api.post(`/inbox/conversations/${encodeURIComponent(conversationId)}/read`),
    onSettled: () => qc.invalidateQueries({ queryKey: inboxKeys.conversationsAll }),
  });
}

/** PATCH /inbox/conversations/{id} — archive / unarchive. */
export function useSetConversationStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: "active" | "archived" }) =>
      api.patch(`/inbox/conversations/${encodeURIComponent(id)}`, { status }),
    onSettled: () => qc.invalidateQueries({ queryKey: inboxKeys.conversationsAll }),
  });
}

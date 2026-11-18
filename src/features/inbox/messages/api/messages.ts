import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { api, toQuery, userKeys } from "@/shared/api";
import { useIsRealtimeOnline } from "@/shared/realtime";

import { useResponders } from "../store/responders-store";
import type {
  InboxPage,
  Message,
  SendMessageRequest,
  SendMessageResponse,
  SenderAction,
} from "../types";
import { inboxKeys } from "./keys";

const POLL_MS = 8_000;
/** With webhooks flowing, the thread is refreshed on events; polling is only a safety net. */
const POLL_REALTIME_MS = 60_000;
const PAGE_SIZE = 50;

/**
 * GET /inbox/conversations/{id}/messages — the API returns newest first;
 * `messages` here is flattened oldest → newest for display.
 */
export function useMessages(conversationId: string | undefined) {
  const realtime = useIsRealtimeOnline();
  const query = useInfiniteQuery({
    queryKey: inboxKeys.messages(conversationId ?? ""),
    queryFn: ({ pageParam }) =>
      api.get<InboxPage<Message>>(
        `/inbox/conversations/${encodeURIComponent(conversationId!)}/messages${toQuery({
          limit: PAGE_SIZE,
          cursor: pageParam,
        })}`,
      ),
    initialPageParam: "",
    getNextPageParam: (last) =>
      last.pagination.has_more && last.pagination.next_cursor
        ? last.pagination.next_cursor
        : undefined,
    enabled: !!conversationId,
    refetchInterval: realtime ? POLL_REALTIME_MS : POLL_MS,
  });

  const messages = (query.data?.pages ?? []).flatMap((p) => p.data ?? []).reverse();
  return { ...query, messages };
}

/**
 * POST /inbox/conversations/{id}/messages. Costs 1 interaction credit per request.
 * The response has no message object — the list is refetched to pick it up.
 */
export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, body }: { conversationId: string; body: SendMessageRequest }) =>
      api.post<SendMessageResponse>(
        `/inbox/conversations/${encodeURIComponent(conversationId)}/messages`,
        body,
      ),
    // Sent by a person from the app (the bot posts directly, not through this hook).
    onSuccess: (_data, { conversationId }) =>
      useResponders.getState().mark(conversationId, "human"),
    onSettled: async (_data, _err, { conversationId }) => {
      qc.invalidateQueries({ queryKey: inboxKeys.conversationsAll });
      qc.invalidateQueries({ queryKey: userKeys.usage });
      await qc.invalidateQueries({ queryKey: inboxKeys.messages(conversationId) });
    },
  });
}

/** Add (emoji) or remove (null) your reaction. Instagram & Facebook only. Free. */
export function setReaction(
  conversationId: string,
  messagePlatformId: string,
  accountId: string,
  reaction: string | null,
) {
  const path = `/inbox/conversations/${encodeURIComponent(conversationId)}/messages/${encodeURIComponent(messagePlatformId)}/reaction`;
  return reaction
    ? api.post(path, { account_id: accountId, reaction })
    : api.delete(`${path}${toQuery({ account_id: accountId })}`);
}

/** typing_on / typing_off / mark_seen. Instagram, Facebook, WhatsApp only. Free. */
export function sendSenderAction(conversationId: string, accountId: string, action: SenderAction) {
  return api.post(`/inbox/conversations/${encodeURIComponent(conversationId)}/sender-action`, {
    account_id: accountId,
    action,
  });
}

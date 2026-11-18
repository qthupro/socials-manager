import { useCustomers } from "../store/customers-store";
import type { Conversation } from "../types";

/** Account filter value meaning "every account". */
export const ALL_ACCOUNTS = "all";

/** Search param holding the open conversation id on the Messages screen. */
export const CONVERSATION_PARAM = "c";

/** Route to the Messages screen, optionally with a conversation open. */
export const messagesLink = (conversationId?: string) =>
  conversationId
    ? `/inbox/messages?${CONVERSATION_PARAM}=${encodeURIComponent(conversationId)}`
    : "/inbox/messages";

/** One customer across conversations: same platform + participant id. */
export const customerKey = (c: Conversation) =>
  c.participant_id ? `${c.platform}:${c.participant_id}` : `conversation:${c.id}`;

/** Name as the platform reports it; participant_name can be empty (some WhatsApp / X threads). */
export function platformName(c: Conversation) {
  return c.participant_name || c.participant_id || "Không rõ tên";
}

/**
 * Display name: the one saved in customer info, else the platform's.
 * Components that render it should subscribe to `useCustomers` so edits show up.
 */
export function contactName(c: Conversation) {
  return useCustomers.getState().customers[customerKey(c)]?.name || platformName(c);
}

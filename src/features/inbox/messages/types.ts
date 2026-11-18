/**
 * SocialAPI DM inbox schemas.
 * Docs: guides/direct-messages, api-reference/inbox/*.
 */

/** InboxConversation — one participant per conversation (flat fields). */
export interface Conversation {
  /** UUID; the {conversation_id} in paths. */
  id: string;
  account_id: string;
  /** Facebook only (sapi_page_…). */
  page_id?: string;
  /** May be an alias such as instagram_fb — resolve with getPlatform(). */
  platform: string;
  platform_id: string;
  participant_id: string;
  /** Can be empty. */
  participant_name: string;
  /** Often empty (always on WhatsApp / Telegram / Zalo). */
  participant_picture: string;
  last_message: string;
  last_message_at: string | null;
  status: "active" | "archived";
  /** Always 0 on X, Zalo and Bluesky. */
  unread_count: number;
  created_at: string;
  updated_at: string;
}

export type MessageStatus = "pending" | "sent" | "delivered" | "read" | "failed";

/** InboxMessage. */
export interface Message {
  id: string;
  conversation_id: string;
  /** Platform message id — used for reactions and reply_to. */
  platform_id: string;
  direction: "incoming" | "outgoing";
  /** "[Attachment]" for attachment-only outgoing messages. */
  text: string | null;
  sender_id: string;
  sender_name: string;
  /** image | video | audio | document | sticker | photo | GIF | voice … (platform-specific). */
  attachment_type: string | null;
  attachment_url: string | null;
  reply_to: { platform_id: string } | null;
  /** Outgoing only. */
  status?: MessageStatus;
  status_updated_at?: string;
  created_at: string;
}

export type SyncState = "idle" | "syncing" | "failed" | "";

/** Envelope of the conversation / message lists. */
export interface InboxPage<T> {
  data: T[] | null;
  pagination: { has_more: boolean; next_cursor: string };
  sync_state: SyncState;
  last_synced_at: string | null;
}

export interface DmAttachmentInput {
  source_type: "url" | "media_id" | "platform_attachment_id";
  source: string;
  type?: "image" | "video" | "audio" | "file" | "sticker";
  caption?: string;
}

export interface SendMessageRequest {
  account_id: string;
  text?: string;
  attachments?: DmAttachmentInput[];
  /** A message platform_id. Facebook, Zalo, Instagram via Facebook Login. */
  reply_to_message_id?: string;
  quick_replies?: { title: string; payload: string }[];
}

export interface SendMessageResponse {
  success: boolean;
  message_ids: string[];
}

export interface SyncStatus {
  state: SyncState;
  started_at: string | null;
  finished_at: string | null;
  last_synced_at: string | null;
  error: string | null;
}

export type SenderAction = "typing_on" | "typing_off" | "mark_seen";

export interface ConversationFilters {
  accountId?: string;
  /** Facebook Page (sapi_page_…). */
  pageId?: string;
  status: "active" | "archived";
}

export const inboxKeys = {
  all: ["inbox"] as const,
  conversations: (f: ConversationFilters) => ["inbox", "conversations", f] as const,
  conversationsAll: ["inbox", "conversations"] as const,
  messages: (conversationId: string) => ["inbox", "messages", conversationId] as const,
  media: (url: string) => ["inbox", "media", url] as const,
};

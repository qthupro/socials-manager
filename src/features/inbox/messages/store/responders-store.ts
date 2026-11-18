import { createPersistedStore } from "@/shared/lib/storage";

export type Responder = "bot" | "human";

/** Last time each kind of responder replied in a conversation (ISO). */
export interface ConversationResponders {
  bot?: string;
  human?: string;
}

interface RespondersState {
  byConversation: Record<string, ConversationResponders>;
  /** Records a reply; keeps the later timestamp if one is already known. */
  mark: (conversationId: string, who: Responder, at?: string) => void;
}

/** Most recently touched conversations kept; older ones just lose their badge. */
const MAX_CONVERSATIONS = 1000;

/**
 * Who has answered each DM conversation: the AI bot, a human, or both. The inbox API
 * doesn't say who sent an outgoing message, so this is recorded on this machine: bot
 * replies by the bot engine, human replies when sent from the app or seen in a thread.
 */
export const useResponders = createPersistedStore<RespondersState>(
  "dm-responders",
  (set) => ({
    byConversation: {},
    mark: (conversationId, who, at = new Date().toISOString()) =>
      set((s) => {
        const prev = s.byConversation[conversationId] ?? {};
        if (prev[who] && prev[who] >= at) return s;
        const rest = Object.entries(s.byConversation).filter(([id]) => id !== conversationId);
        return {
          byConversation: Object.fromEntries([
            ...rest.slice(-(MAX_CONVERSATIONS - 1)),
            [conversationId, { ...prev, [who]: at }],
          ]),
        };
      }),
  }),
  { version: 1 },
);

import { createPersistedStore } from "@/shared/lib/storage";

/** What the user configures for the DM auto-reply bot. */
export interface DmBotSettings {
  enabled: boolean;
  /** true = every DM account; false = only `accountIds`. */
  allAccounts: boolean;
  accountIds: string[];
  /** Extra instructions on top of Settings → AI business info. */
  instructions: string;
  /** Wait before answering (also lets a human answer first). */
  delaySeconds: number;
  /** Comma-separated: when the customer writes one, the bot stops for that conversation. */
  handoffKeywords: string;
  /** A human replied within this many minutes → the bot stays quiet. */
  humanPauseMinutes: number;
  /** Max bot replies per conversation per day (avoids endless back-and-forth). */
  maxRepliesPerDay: number;
}

export interface DmBotLogEntry {
  at: string;
  kind: "reply" | "skip" | "handoff" | "lead" | "error";
  /** Customer name / conversation. */
  subject: string;
  detail?: string;
  conversationId?: string;
}

interface ConversationState {
  /** YYYY-MM-DD the counter belongs to. */
  day: string;
  count: number;
  /** Texts the bot sent recently — tells bot messages from human ones. */
  sent: string[];
}

interface DmBotState extends DmBotSettings {
  /** Only messages after this are answered (set when the bot is turned on). */
  enabledAt: string | null;
  /** Incoming message ids already handled (capped). */
  processed: string[];
  conversations: Record<string, ConversationState>;
  /** Conversations handed to a human (customer asked, or turned off by hand). */
  paused: Record<string, { at: string; reason: string; name: string }>;
  log: DmBotLogEntry[];
  save: (settings: DmBotSettings) => void;
  markProcessed: (messageId: string) => void;
  recordReply: (conversationId: string, text: string) => void;
  pause: (conversationId: string, name: string, reason: string) => void;
  resume: (conversationId: string) => void;
  addLog: (entry: Omit<DmBotLogEntry, "at">) => void;
}

export const DEFAULT_DM_BOT: DmBotSettings = {
  enabled: false,
  allAccounts: true,
  accountIds: [],
  instructions: "",
  delaySeconds: 20,
  handoffKeywords: "gặp nhân viên, người thật, tư vấn viên, khiếu nại, hoàn tiền",
  humanPauseMinutes: 30,
  maxRepliesPerDay: 10,
};

const MAX_PROCESSED = 2000;
const MAX_LOG = 50;
const MAX_SENT = 20;
export const today = () => new Date().toISOString().slice(0, 10);

export const useDmBot = createPersistedStore<DmBotState>(
  "dm-bot",
  (set, get) => ({
    ...DEFAULT_DM_BOT,
    enabledAt: null,
    processed: [],
    conversations: {},
    paused: {},
    log: [],
    save: (settings) =>
      set({
        ...settings,
        // Turning it on starts from "now": earlier messages are never auto-answered.
        enabledAt: settings.enabled
          ? get().enabled
            ? get().enabledAt
            : new Date().toISOString()
          : null,
      }),
    markProcessed: (id) => set((s) => ({ processed: [...s.processed, id].slice(-MAX_PROCESSED) })),
    recordReply: (conversationId, text) =>
      set((s) => {
        const prev = s.conversations[conversationId];
        const day = today();
        const count = prev?.day === day ? prev.count + 1 : 1;
        return {
          conversations: {
            ...s.conversations,
            [conversationId]: { day, count, sent: [...(prev?.sent ?? []), text].slice(-MAX_SENT) },
          },
        };
      }),
    pause: (conversationId, name, reason) =>
      set((s) => ({
        paused: { ...s.paused, [conversationId]: { at: new Date().toISOString(), reason, name } },
      })),
    resume: (conversationId) =>
      set((s) => {
        const paused = { ...s.paused };
        delete paused[conversationId];
        return { paused };
      }),
    addLog: (entry) =>
      set((s) => ({
        log: [{ ...entry, at: new Date().toISOString() }, ...s.log].slice(0, MAX_LOG),
      })),
  }),
  { version: 1 },
);

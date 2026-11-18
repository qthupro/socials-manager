import { createPersistedStore } from "@/shared/lib/storage";

export interface ReplyRule {
  id: string;
  /** Comma-separated; matches if the comment contains any of them (case-insensitive). */
  keywords: string;
  reply: string;
}

export interface AutomationSettings {
  enabled: boolean;
  autoLike: boolean;
  autoReply: boolean;
  /** "ai" falls back to templates while no AI provider is configured. */
  replyMode: "template" | "ai";
  rules: ReplyRule[];
  /** Used when no rule matches; empty = don't reply. */
  defaultReply: string;
  autoPrivateReply: boolean;
  privateMessage: string;
  /** Wait before acting, so it doesn't look instant. */
  delaySeconds: number;
}

export interface AutomationLogEntry {
  at: string;
  kind: "like" | "reply" | "private" | "skip" | "error";
  /** Who / what it was about. */
  subject: string;
  detail?: string;
}

interface AutomationState extends AutomationSettings {
  /** Only comments created after this are handled (set when automation is turned on). */
  enabledAt: string | null;
  /** sapi_cmt_ ids already handled (most recent last, capped). */
  processed: string[];
  /** Recent activity, newest first (shown in the settings dialog). */
  log: AutomationLogEntry[];
  lastCheckAt: string | null;
  save: (settings: AutomationSettings) => void;
  markProcessed: (id: string) => void;
  addLog: (entry: Omit<AutomationLogEntry, "at">) => void;
  setLastCheck: () => void;
}

const MAX_LOG = 30;

export const DEFAULT_AUTOMATION: AutomationSettings = {
  enabled: false,
  autoLike: false,
  autoReply: false,
  replyMode: "template",
  rules: [],
  defaultReply: "",
  autoPrivateReply: false,
  privateMessage:
    "Chào {name}, cảm ơn bạn đã bình luận! Mình nhắn riêng để hỗ trợ bạn nhanh hơn nhé.",
  delaySeconds: 30,
};

const MAX_PROCESSED = 1000;

export const useCommentAutomation = createPersistedStore<AutomationState>(
  "comment-automation",
  (set, get) => ({
    ...DEFAULT_AUTOMATION,
    enabledAt: null,
    processed: [],
    log: [],
    lastCheckAt: null,
    addLog: (entry) =>
      set((s) => ({
        log: [{ ...entry, at: new Date().toISOString() }, ...s.log].slice(0, MAX_LOG),
      })),
    setLastCheck: () => set({ lastCheckAt: new Date().toISOString() }),
    save: (settings) =>
      set({
        ...settings,
        // Turning it on starts from "now": older comments are never auto-handled.
        enabledAt: settings.enabled
          ? get().enabled
            ? get().enabledAt
            : new Date().toISOString()
          : null,
      }),
    markProcessed: (id) => set((s) => ({ processed: [...s.processed, id].slice(-MAX_PROCESSED) })),
  }),
  { version: 1 },
);

/**
 * What the auto-reply bots know about the business — separately for DMs and for
 * comments (a comment answer is public and short, a DM can share details).
 */
import { createPersistedStore, storageKey } from "@/shared/lib/storage";

export type KnowledgeTab = "messages" | "comments";

interface KnowledgeState {
  messages: string;
  comments: string;
  set: (tab: KnowledgeTab, text: string) => void;
}

/** Business info written in the old Settings → AI section, carried over once. */
function legacyBusinessInfo(): string {
  try {
    const raw = localStorage.getItem(storageKey("ai"));
    const info = raw
      ? (JSON.parse(raw) as { state?: { businessInfo?: unknown } }).state?.businessInfo
      : "";
    return typeof info === "string" ? info : "";
  } catch {
    return "";
  }
}

export const useReplyKnowledge = createPersistedStore<KnowledgeState>(
  "reply-knowledge",
  (set) => {
    const legacy = legacyBusinessInfo();
    return {
      messages: legacy,
      comments: legacy,
      set: (tab, text) => set({ [tab]: text }),
    };
  },
  { version: 1 },
);

/** System-prompt block for one channel type ("" when nothing is written). */
export function knowledgeBlock(tab: KnowledgeTab): string {
  const info = useReplyKnowledge.getState()[tab].trim();
  return info
    ? `\n\nThông tin doanh nghiệp (chỉ dùng những gì có ở đây, không bịa thêm):\n${info}`
    : "";
}

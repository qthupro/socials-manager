import { createPersistedStore } from "@/shared/lib/storage";

/** Something this app sent in answer to a comment. */
export interface CommentMark {
  at: string;
  /** What was sent (private replies are invisible elsewhere, so it's kept here). */
  text?: string;
  /** Sent by the automation rather than by hand. */
  auto?: boolean;
}

export interface CommentHistoryEntry extends CommentMark {
  kind: "reply" | "private";
}

/**
 * What this app did on comments, kept in localStorage (key "social-manager:comment-marks").
 * SocialAPI has no "replied" / "private-replied" flag, so these drive the classification,
 * and `history` shows every answer sent from the app under each comment.
 */
interface CommentMarksState {
  /** Latest public reply per comment (sapi_cmt_ id). */
  replied: Record<string, CommentMark>;
  /** Latest private reply per comment. */
  privateReplied: Record<string, CommentMark>;
  /** Every answer sent from the app per comment, oldest first. */
  history: Record<string, CommentHistoryEntry[]>;
  markReplied: (commentId: string, text?: string, auto?: boolean) => void;
  markPrivateReplied: (commentId: string, text?: string, auto?: boolean) => void;
}

const MAX_HISTORY = 20;

const mark = (text?: string, auto?: boolean): CommentMark => ({
  at: new Date().toISOString(),
  ...(text && { text }),
  ...(auto && { auto }),
});

const pushHistory = (
  history: Record<string, CommentHistoryEntry[]>,
  id: string,
  entry: CommentHistoryEntry,
) => ({ ...history, [id]: [...(history[id] ?? []), entry].slice(-MAX_HISTORY) });

export const useCommentMarks = createPersistedStore<CommentMarksState>(
  "comment-marks",
  (set) => ({
    replied: {},
    privateReplied: {},
    history: {},
    markReplied: (id, text, auto) => {
      const m = mark(text, auto);
      set((s) => ({
        replied: { ...s.replied, [id]: m },
        history: pushHistory(s.history, id, { kind: "reply", ...m }),
      }));
    },
    markPrivateReplied: (id, text, auto) => {
      const m = mark(text, auto);
      set((s) => ({
        privateReplied: { ...s.privateReplied, [id]: m },
        history: pushHistory(s.history, id, { kind: "private", ...m }),
      }));
    },
  }),
  {
    // v2: marks became { at, text?, auto? } instead of a bare timestamp.
    // v3: per-comment `history`, seeded from the existing marks.
    version: 3,
    migrate: (persisted, from) => {
      const state = persisted as Record<string, unknown>;
      const maps = ["replied", "privateReplied"] as const;
      if (from < 2) {
        for (const key of maps) {
          const map = (state[key] ?? {}) as Record<string, unknown>;
          state[key] = Object.fromEntries(
            Object.entries(map).map(([id, v]) => [id, typeof v === "string" ? { at: v } : v]),
          );
        }
      }
      if (from < 3) {
        const history: Record<string, CommentHistoryEntry[]> = {};
        for (const key of maps) {
          const kind: CommentHistoryEntry["kind"] = key === "replied" ? "reply" : "private";
          for (const [id, m] of Object.entries((state[key] ?? {}) as Record<string, CommentMark>)) {
            history[id] = [...(history[id] ?? []), { kind, ...m }].sort((a, b) =>
              a.at.localeCompare(b.at),
            );
          }
        }
        state.history = history;
      }
      return state as unknown as CommentMarksState;
    },
  },
);

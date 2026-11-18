/**
 * Comment classification for the inbox tabs. Derived, because the API has no
 * replied / private-replied flags:
 *  - replied: an owner reply exists under it, or this app replied to it,
 *  - privateReplied: this app sent the commenter a private reply.
 */
import type { Comment } from "../types";

export type CommentFilter = "all" | "unanswered" | "answered" | "private" | "hidden" | "held";

export interface CommentMarks {
  replied: Record<string, unknown>;
  privateReplied: Record<string, unknown>;
}

export interface CommentStatus {
  replied: boolean;
  privateReplied: boolean;
  held: boolean;
}

export const isHeld = (c: Comment) =>
  c.moderation_status === "held_for_review" || c.moderation_status === "likely_spam";

export function commentStatus(
  c: Comment,
  replies: Comment[] | undefined,
  marks: CommentMarks,
): CommentStatus {
  return {
    replied: !!marks.replied[c.id] || !!replies?.some((r) => r.is_owner),
    privateReplied: !!marks.privateReplied[c.id],
    held: isHeld(c),
  };
}

/** Whether a (non-owner) comment belongs in a tab. Own comments only show under "all". */
export function matchesFilter(c: Comment, s: CommentStatus, filter: CommentFilter): boolean {
  if (filter === "all") return !s.held;
  if (filter === "held") return s.held;
  if (c.is_owner || s.held) return false;
  switch (filter) {
    case "unanswered":
      return !s.replied && !s.privateReplied && !c.is_hidden;
    case "answered":
      return s.replied;
    case "private":
      return s.privateReplied;
    case "hidden":
      return c.is_hidden;
  }
}

/** Comments still waiting for an answer (not ours, not hidden/held, not replied in any way). */
export function countUnanswered(
  comments: Comment[],
  replies: Record<string, Comment[]>,
  marks: CommentMarks,
) {
  return comments.filter((c) =>
    matchesFilter(c, commentStatus(c, replies[c.id], marks), "unanswered"),
  ).length;
}

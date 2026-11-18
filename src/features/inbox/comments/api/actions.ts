import { useQueryClient, type InfiniteData, type QueryClient } from "@tanstack/react-query";

import { api, ApiError, toQuery, userKeys } from "@/shared/api";

import { useCommentMarks } from "../store/marks-store";
import type { Comment, CommentPage, InboxPost, ModerationStatus } from "../types";
import { commentKeys } from "./keys";
import { postPath } from "./paths";

/** Applies `fn` to a comment wherever it's cached (top-level lists and reply lists). */
function patchCached(qc: QueryClient, postId: string, id: string, fn: (c: Comment) => Comment) {
  qc.setQueriesData<InfiniteData<CommentPage<Comment>>>(
    { queryKey: commentKeys.list(postId) },
    (data) =>
      data && {
        ...data,
        pages: data.pages.map((p) => ({
          ...p,
          data: p.data?.map((c) => (c.id === id ? fn(c) : c)) ?? null,
        })),
      },
  );
  qc.setQueriesData<Comment[]>({ queryKey: commentKeys.replies(postId) }, (list) =>
    list?.map((c) => (c.id === id ? fn(c) : c)),
  );
}

/**
 * Comment actions for one post. Like / hide are applied optimistically and rolled back
 * on error; everything refetches afterwards. Errors are re-thrown for the caller to show.
 */
export function useCommentActions(post: InboxPost) {
  const qc = useQueryClient();
  const base = `/inbox/comments/${postPath(post)}`;
  const account = { account_id: post.account_id };
  const marks = useCommentMarks.getState;

  const refresh = (parent?: Comment) => {
    qc.invalidateQueries({ queryKey: commentKeys.list(post.id) });
    if (parent) qc.invalidateQueries({ queryKey: commentKeys.replies(post.id, parent.id) });
    qc.invalidateQueries({ queryKey: [...commentKeys.all, "posts"] });
  };

  const optimistic = async (c: Comment, patch: Partial<Comment>, call: () => Promise<unknown>) => {
    const before = { ...c };
    patchCached(qc, post.id, c.id, (x) => ({ ...x, ...patch }));
    try {
      await call();
    } catch (err) {
      patchCached(qc, post.id, c.id, () => before);
      throw err;
    } finally {
      refresh();
    }
  };

  const commentPath = (c: Comment) => `${base}/${encodeURIComponent(c.id)}`;

  return {
    /** POST /inbox/comments/{post_id} — top-level comment, or a reply to `parent` (1 credit). */
    reply: async (text: string, parent?: Comment) => {
      await api.post(base, { ...account, text, ...(parent && { comment_id: parent.id }) });
      if (parent) marks().markReplied(parent.id, text);
      qc.invalidateQueries({ queryKey: userKeys.usage });
      refresh(parent);
    },

    like: (c: Comment) =>
      optimistic(
        c,
        {
          liked_by_viewer: !c.liked_by_viewer,
          like_count: c.like_count + (c.liked_by_viewer ? -1 : 1),
        },
        () =>
          c.liked_by_viewer
            ? api.delete(`${commentPath(c)}/like${toQuery(account)}`)
            : api.post(`${commentPath(c)}/like`, account),
      ),

    hide: (c: Comment) =>
      optimistic(c, { is_hidden: !c.is_hidden }, () =>
        c.is_hidden
          ? api.delete(`${commentPath(c)}/hide${toQuery(account)}`)
          : api.post(`${commentPath(c)}/hide`, account),
      ),

    remove: async (c: Comment) => {
      await api.delete(`${commentPath(c)}${toQuery(account)}`);
      refresh();
    },

    /** Instagram & Facebook: DM the commenter — once per comment, within 7 days (1 credit). */
    privateReply: async (c: Comment, text: string) => {
      try {
        await api.post(`${commentPath(c)}/private-reply`, { ...account, text });
        marks().markPrivateReplied(c.id, text);
      } catch (err) {
        // Already answered privately (e.g. on the platform itself): remember it anyway.
        if (err instanceof ApiError && err.meta?.reason === "already_replied") {
          marks().markPrivateReplied(c.id);
        }
        throw err;
      } finally {
        qc.invalidateQueries({ queryKey: userKeys.usage });
      }
    },

    /** YouTube: publish / hold / reject (optionally banning the author). */
    moderate: async (c: Comment, status: ModerationStatus, banAuthor = false) => {
      await api.post(`/platforms/youtube/comments/${encodeURIComponent(c.id)}/moderate`, {
        ...account,
        post_id: post.id,
        status,
        ...(banAuthor && { ban_author: true }),
      });
      refresh();
    },
  };
}

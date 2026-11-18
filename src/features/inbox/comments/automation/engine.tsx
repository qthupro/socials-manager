import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { api, getErrorMessage, toQuery, useApiKey, userKeys } from "@/shared/api";
import { onRealtimeEvent, useIsRealtimeOnline } from "@/shared/realtime";

import { commentKeys } from "../api/keys";
import { postPath } from "../api/paths";
import { replyMaxFor } from "../lib/platforms";
import { useCommentMarks } from "../store/marks-store";
import type { Comment, CommentPage, InboxPost } from "../types";
import { fillTemplate, pickReply } from "./replies";
import { useServerAutomations } from "./server-api";
import { useCommentAutomation } from "./store";

/** Without webhooks, check this often. */
const POLL_MS = 60_000;
/** Posts whose comment_count is watched for increases. */
const WATCH_POSTS = 25;
/** Newest posts always checked (comment counts can lag on TikTok / YouTube). */
const ALWAYS_CHECK = 3;

type PostRef = Pick<InboxPost, "id" | "platform" | "account_id"> & Partial<InboxPost>;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const who = (c: Comment) => c.author_name || c.author_username || "Người dùng";

async function fetchComments(post: PostRef) {
  const page = await api.get<CommentPage<Comment>>(
    `/inbox/comments/${postPath(post)}${toQuery({ account_id: post.account_id, limit: 50 })}`,
  );
  return page.data ?? [];
}

/**
 * Runs comment automation while the app is open (also hidden in the tray):
 * auto-like, auto-reply (keyword templates or AI) and auto private reply — each only when
 * the comment's capabilities allow it. Handles each new top-level comment once.
 *
 * Triggers: comment.received webhooks (realtime), or polling — posts whose comment_count
 * grew since the last check (the posts list is ordered by publish date, not by activity).
 */
export function CommentAutomationEngine() {
  const qc = useQueryClient();
  const enabled = useCommentAutomation((s) => s.enabled);
  const hasKey = useApiKey((s) => !!s.apiKey);
  const realtime = useIsRealtimeOnline();
  const inFlight = useRef(new Set<string>());

  // Accounts with an active SocialAPI (24/7) comment rule are left to the server,
  // so commenters don't get two answers.
  const serverRules = useServerAutomations();
  const serverHandled = useRef(new Set<string>());
  useEffect(() => {
    serverHandled.current = new Set(
      (serverRules.data ?? [])
        .filter((r) => r.trigger === "comment" && r.status === "active")
        .map((r) => r.account_id),
    );
  }, [serverRules.data]);

  const handle = useRef(async (post: PostRef, c: Comment) => {
    const s = useCommentAutomation.getState();
    if (!s.enabled || !s.enabledAt) return;
    // New, top-level comments from other people only (never our own — no loops).
    if (c.is_owner || c.is_hidden || c.parent_id) return;
    if (new Date(c.created_at).getTime() < new Date(s.enabledAt).getTime()) return;
    if (s.processed.includes(c.id) || inFlight.current.has(c.id)) return;
    if (serverHandled.current.has(post.account_id)) return;

    inFlight.current.add(c.id);
    s.markProcessed(c.id);
    const log = s.addLog;
    try {
      if (s.delaySeconds > 0) await sleep(s.delaySeconds * 1000);
      const caps = c.capabilities;
      const account = { account_id: post.account_id };
      const commentPath = `/inbox/comments/${postPath(post)}/${encodeURIComponent(c.id)}`;
      const marks = useCommentMarks.getState();

      if (s.autoLike) {
        if (!caps.can_like)
          log({ kind: "skip", subject: who(c), detail: "Nền tảng không cho thích" });
        else if (!c.liked_by_viewer) {
          await api.post(`${commentPath}/like`, account);
          log({ kind: "like", subject: who(c) });
        }
      }

      if (s.autoReply && !marks.replied[c.id]) {
        const text = caps.can_reply ? await pickReply(s, c, post as InboxPost) : undefined;
        const max = replyMaxFor(post.platform);
        if (!caps.can_reply)
          log({ kind: "skip", subject: who(c), detail: "Nền tảng không cho trả lời" });
        else if (!text)
          log({ kind: "skip", subject: who(c), detail: "Không có mẫu trả lời phù hợp" });
        else if (max && text.length > max) {
          log({ kind: "skip", subject: who(c), detail: `Câu trả lời dài hơn ${max} ký tự` });
        } else {
          await api.post(`/inbox/comments/${postPath(post)}`, {
            ...account,
            text,
            comment_id: c.id,
          });
          marks.markReplied(c.id, text, true);
          log({ kind: "reply", subject: who(c), detail: text });
        }
      }

      if (s.autoPrivateReply && !marks.privateReplied[c.id]) {
        const text = fillTemplate(s.privateMessage, c);
        if (!caps.can_private_reply) {
          log({ kind: "skip", subject: who(c), detail: "Kênh này không hỗ trợ nhắn riêng" });
        } else if (text) {
          await api.post(`${commentPath}/private-reply`, { ...account, text });
          marks.markPrivateReplied(c.id, text, true);
          log({ kind: "private", subject: who(c), detail: text });
        }
      }
    } catch (err) {
      log({ kind: "error", subject: who(c), detail: getErrorMessage(err) });
    } finally {
      inFlight.current.delete(c.id);
      qc.invalidateQueries({ queryKey: commentKeys.all });
      qc.invalidateQueries({ queryKey: userKeys.usage });
    }
  });

  // Realtime: act on each comment.received (Instagram, Facebook, TikTok).
  useEffect(() => {
    if (!enabled || !hasKey) return;
    return onRealtimeEvent(async (e) => {
      if (e.event !== "comment.received") return;
      const d = (e.body.data ?? {}) as {
        id?: string;
        platform?: string;
        account_id?: string;
        platform_post_id?: string;
      };
      // Threads events carry the Threads user id instead of acc_… — polling covers those.
      if (!d.id || !d.platform || !d.platform_post_id || !d.account_id?.startsWith("acc_")) return;
      const post = { id: d.platform_post_id, platform: d.platform, account_id: d.account_id };
      try {
        const comment = (await fetchComments(post)).find((c) => c.id === d.id);
        if (comment) await handle.current(post, comment);
      } catch (err) {
        useCommentAutomation
          .getState()
          .addLog({ kind: "error", subject: "Webhook", detail: getErrorMessage(err) });
      }
    });
  }, [enabled, hasKey]);

  // Polling (also the safety net while realtime is on, at a slower pace).
  useEffect(() => {
    if (!enabled || !hasKey) return;
    let stopped = false;
    /** comment_count per post from the previous check. */
    const counts = new Map<string, number>();

    const tick = async () => {
      try {
        const posts =
          (
            await api.get<CommentPage<InboxPost>>(
              `/inbox/comments${toQuery({ min_comments: 1, limit: WATCH_POSTS })}`,
            )
          ).data ?? [];
        const firstRun = counts.size === 0;
        const toCheck = posts.filter(
          (p, i) => i < ALWAYS_CHECK || (!firstRun && p.comment_count > (counts.get(p.id) ?? 0)),
        );
        for (const p of posts) counts.set(p.id, p.comment_count);

        for (const post of toCheck) {
          if (stopped) return;
          for (const c of await fetchComments(post)) await handle.current(post, c);
        }
        useCommentAutomation.getState().setLastCheck();
      } catch (err) {
        useCommentAutomation
          .getState()
          .addLog({ kind: "error", subject: "Kiểm tra bình luận", detail: getErrorMessage(err) });
      }
    };

    tick();
    const timer = setInterval(tick, realtime ? POLL_MS * 3 : POLL_MS);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [enabled, hasKey, realtime]);

  return null;
}

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { api, toQuery, useApiKey } from "@/shared/api";
import { isAppFocused, notify } from "@/shared/platform/desktop";
import { onRealtimeEvent, useIsRealtimeOnline } from "@/shared/realtime";
import { useAppSettings } from "@/shared/settings/app-settings";

import { inboxKeys } from "../api/keys";
import { getDmCapabilities } from "../lib/capabilities";
import { contactName, messagesLink } from "../lib/conversation";
import { useActiveConversation } from "../store/active-conversation";
import type { Conversation, InboxPage } from "../types";

const POLL_MS = 30_000;
const POLL_REALTIME_MS = 120_000;

/** Webhook events that change what the inbox shows. */
const INBOX_EVENT = /^(dm\.|comment\.|mention\.|review\.)/;

const preview = (text: string | undefined | null) =>
  !text || text === "[Attachment]" ? "📎 Tệp đính kèm" : text;

/**
 * Notify unless the user is already reading that very conversation
 * (app focused + that thread open) — same rule as Messenger / Zalo.
 */
async function shouldNotify(conversationId: string | undefined) {
  if (!useAppSettings.getState().notifyNewMessages) return false;
  if (!conversationId || conversationId !== useActiveConversation.getState().id) return true;
  return !(await isAppFocused());
}

interface DmEventData {
  conversation_id?: string;
  author?: { name?: string; username?: string };
  content?: { text?: string };
}

/**
 * App-wide watcher for new messages. Renders nothing.
 *  - Realtime on: notifies straight from the dm.received webhook.
 *  - Realtime off: polls the newest conversations (also while hidden in the tray)
 *    and notifies for ones whose last message got newer.
 */
export function InboxNotifier() {
  const qc = useQueryClient();
  const hasKey = useApiKey((s) => !!s.apiKey);
  const enabled = useAppSettings((s) => s.notifyNewMessages);
  const realtime = useIsRealtimeOnline();

  // Webhook → refresh inbox data, and notify immediately for incoming DMs.
  useEffect(
    () =>
      onRealtimeEvent(async (e) => {
        if (!INBOX_EVENT.test(e.event)) return;
        // Array form = SocialAPI echoing our own mentions list call, nothing new.
        if (e.event === "mention.received" && Array.isArray(e.body.data)) return;
        qc.invalidateQueries({ queryKey: inboxKeys.all });
        if (e.event !== "dm.received") return;
        const data = (e.body.data ?? {}) as DmEventData;
        if (await shouldNotify(data.conversation_id)) {
          notify(
            data.author?.name || data.author?.username || "Tin nhắn mới",
            preview(data.content?.text),
            messagesLink(data.conversation_id),
          );
        }
      }),
    [qc],
  );

  const latest = useQuery({
    queryKey: [...inboxKeys.all, "notifier"],
    queryFn: () =>
      api.get<InboxPage<Conversation>>(
        `/inbox/conversations${toQuery({ status: "active", limit: 50 })}`,
      ),
    enabled: hasKey && enabled,
    refetchInterval: realtime ? POLL_REALTIME_MS : POLL_MS,
    refetchIntervalInBackground: true,
  });

  // last_message_at per conversation from the previous poll; null until the first one.
  const seen = useRef<Map<string, string> | null>(null);

  useEffect(() => {
    const list = latest.data?.data;
    if (!list) return;
    const previous = seen.current;
    seen.current = new Map(list.map((c) => [c.id, c.last_message_at ?? ""]));
    // First load just records state; in realtime mode webhooks already notified.
    if (!previous || realtime) return;

    const fresh = list.filter((c) => {
      if (!c.last_message_at || c.last_message_at <= (previous.get(c.id) ?? "")) return false;
      // X / Zalo / Bluesky never report unread counts — any newer message counts.
      return c.unread_count > 0 || !getDmCapabilities(c.platform).unreadCounts;
    });
    if (fresh.length === 0) return;

    // Keep the open inbox in step with what the notification says.
    qc.invalidateQueries({ queryKey: inboxKeys.conversationsAll });

    (async () => {
      const toShow: Conversation[] = [];
      for (const c of fresh) if (await shouldNotify(c.id)) toShow.push(c);
      if (toShow.length === 1) {
        notify(contactName(toShow[0]), preview(toShow[0].last_message), messagesLink(toShow[0].id));
      } else if (toShow.length > 1) {
        notify(
          `${toShow.length} hội thoại có tin nhắn mới`,
          toShow.map(contactName).slice(0, 3).join(", "),
          messagesLink(),
        );
      }
    })();
  }, [latest.data, qc, realtime]);

  return null;
}

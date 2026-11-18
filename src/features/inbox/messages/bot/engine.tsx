import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { api, getErrorMessage, toQuery, useApiKey, userKeys } from "@/shared/api";
import { getAiProvider, useAiReady } from "@/shared/ai";
import { getPlatform } from "@/shared/config/platforms";
import { notify } from "@/shared/platform/desktop";
import { onRealtimeEvent, useIsRealtimeOnline } from "@/shared/realtime";

import {
  buildBotSystemPrompt,
  findPhones,
  INTENT_LABEL,
  parseBotOutput,
  useBotPersona,
  usesStructuredOutput,
  type KnownContact,
} from "../../knowledge/persona";
import { inboxKeys } from "../api/keys";
import { getDmCapabilities, isWindowOpen } from "../lib/capabilities";
import { contactName, customerKey, messagesLink } from "../lib/conversation";
import { useCustomers } from "../store/customers-store";
import { useResponders } from "../store/responders-store";
import type { Conversation, InboxPage, Message } from "../types";
import { today, useDmBot } from "./store";

/** Without webhooks, look for new messages this often. */
const POLL_MS = 45_000;
const RECENT_CONVERSATIONS = 20;
const HISTORY = 20;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchConversation(id: string) {
  return (await api.get<{ data: Conversation }>(`/inbox/conversations/${encodeURIComponent(id)}`))
    .data;
}

/** Oldest → newest. */
async function fetchMessages(id: string) {
  const page = await api.get<InboxPage<Message>>(
    `/inbox/conversations/${encodeURIComponent(id)}/messages${toQuery({ limit: HISTORY })}`,
  );
  return (page.data ?? []).reverse();
}

const matchesKeyword = (text: string, keywords: string) => {
  const t = text.toLowerCase();
  return keywords
    .split(",")
    .map((k) => k.trim().toLowerCase())
    .some((k) => k && t.includes(k));
};

function buildPrompt(
  conversation: Conversation,
  history: Message[],
  instructions: string,
  known: KnownContact,
) {
  const name = contactName(conversation);
  const transcript = history
    .filter((m) => m.text && m.text !== "[Attachment]")
    .map((m) => `${m.direction === "incoming" ? name : "Shop"}: ${m.text}`)
    .join("\n");
  return [
    { role: "system" as const, content: buildBotSystemPrompt("messages", known, instructions) },
    {
      role: "user" as const,
      content: `Hội thoại trên ${getPlatform(conversation.platform)?.label ?? conversation.platform} (cũ → mới):\n${transcript}\n\nViết câu trả lời cho tin nhắn mới nhất của khách.`,
    },
  ];
}

/** Contact details already recorded for this customer (Customer info tab). */
function knownContact(conversation: Conversation): KnownContact {
  const info = useCustomers.getState().customers[customerKey(conversation)] ?? {};
  return { phone: info.phone, zalo: info.zalo, name: info.name, address: info.address };
}

/**
 * DM auto-reply bot. Runs while the app is open (also hidden in the tray). Answers a
 * conversation's newest customer message with AI (Settings → AI), unless: the account is
 * off, a human replied recently, the customer asked for a human (handoff → paused +
 * notification), the daily per-conversation cap is reached, or the platform's reply
 * window is closed. Triggered by dm.received webhooks, with polling as a safety net.
 */
export function DmBotEngine() {
  const qc = useQueryClient();
  const enabled = useDmBot((s) => s.enabled);
  const hasKey = useApiKey((s) => !!s.apiKey);
  const aiReady = useAiReady();
  const realtime = useIsRealtimeOnline();
  const inFlight = useRef(new Set<string>());
  const active = enabled && hasKey && aiReady;

  const handle = useRef(async (conversationId: string) => {
    const s = useDmBot.getState();
    if (!s.enabled || !s.enabledAt || inFlight.current.has(conversationId)) return;
    if (s.paused[conversationId]) return;
    inFlight.current.add(conversationId);
    const log = s.addLog;
    let name = "Khách";
    try {
      const conversation = await fetchConversation(conversationId);
      name = contactName(conversation);
      if (!s.allAccounts && !s.accountIds.includes(conversation.account_id)) return;

      let history = await fetchMessages(conversationId);
      const last = history[history.length - 1];
      // Only a fresh, unanswered customer message.
      if (!last || last.direction !== "incoming") return;
      if (new Date(last.created_at).getTime() < new Date(s.enabledAt).getTime()) return;
      if (s.processed.includes(last.id)) return;
      s.markProcessed(last.id);

      const base = { subject: name, conversationId };

      if (last.text && matchesKeyword(last.text, s.handoffKeywords)) {
        s.pause(conversationId, name, "Khách muốn gặp người thật");
        log({ ...base, kind: "handoff", detail: `“${last.text.slice(0, 80)}”` });
        notify(`${name} cần nhân viên`, last.text, messagesLink(conversationId));
        return;
      }

      const convo = s.conversations[conversationId];
      if (convo?.day === today() && convo.count >= s.maxRepliesPerDay) {
        log({ ...base, kind: "skip", detail: `Đã trả lời ${s.maxRepliesPerDay} lần hôm nay` });
        return;
      }

      // A human answered recently (an outgoing message the bot didn't write) → stay quiet.
      const sentByBot = new Set(convo?.sent ?? []);
      const pauseMs = s.humanPauseMinutes * 60_000;
      const humanRecently = history.some(
        (m) =>
          m.direction === "outgoing" &&
          !sentByBot.has(m.text ?? "") &&
          Date.now() - new Date(m.created_at).getTime() < pauseMs,
      );
      if (humanRecently) {
        log({ ...base, kind: "skip", detail: "Nhân viên vừa trả lời — bot nhường" });
        return;
      }

      if (s.delaySeconds > 0) await sleep(s.delaySeconds * 1000);

      // Re-read: the customer may have added messages, or someone answered meanwhile.
      history = await fetchMessages(conversationId);
      const newest = history[history.length - 1];
      if (!newest || newest.direction !== "incoming") return;
      if (newest.id !== last.id) s.markProcessed(newest.id);

      const caps = getDmCapabilities(conversation.platform);
      if (!isWindowOpen(caps, history)) {
        log({ ...base, kind: "skip", detail: "Đã quá thời hạn trả lời của nền tảng" });
        return;
      }

      const provider = getAiProvider();
      if (!provider) {
        log({ ...base, kind: "skip", detail: "Chưa cấu hình AI (Cài đặt → AI)" });
        return;
      }
      const persona = useBotPersona.getState();
      const key = customerKey(conversation);

      // Phone numbers the customer typed since our last message — saved without AI.
      const lastOut = history.map((m) => m.direction).lastIndexOf("outgoing");
      const newText = history
        .slice(lastOut + 1)
        .map((m) => m.text ?? "")
        .join("\n");
      const typedPhones = persona.saveContact ? findPhones(newText) : [];

      const structured = usesStructuredOutput("messages", persona);
      const raw = await provider.complete(
        buildPrompt(conversation, history, s.instructions, knownContact(conversation)),
        { maxTokens: 2048 },
      );
      const out = parseBotOutput(raw, structured);
      if (!out?.reply) {
        log({
          ...base,
          kind: "error",
          detail: out ? "AI không trả về nội dung" : "AI trả về sai định dạng — không gửi",
        });
        return;
      }

      // Contact details → Customer info (only empty fields; never overwrites a human's edit).
      if (persona.saveContact) {
        const added = useCustomers.getState().fillIn(key, {
          phone: out.contact?.phone ?? typedPhones[0],
          zalo: out.contact?.zalo,
          name: out.contact?.name,
          address: out.contact?.address,
        });
        const got = [added.phone && `SĐT ${added.phone}`, added.zalo && `Zalo ${added.zalo}`]
          .filter(Boolean)
          .join(", ");
        if (got) {
          log({ ...base, kind: "lead", detail: got });
          notify(`Thông tin liên hệ mới: ${name}`, got, messagesLink(conversationId));
        }
      }

      const text = out.reply.length > caps.textMax ? out.reply.slice(0, caps.textMax) : out.reply;
      await api.post(`/inbox/conversations/${encodeURIComponent(conversationId)}/messages`, {
        account_id: conversation.account_id,
        text,
      });
      useDmBot.getState().recordReply(conversationId, text);
      useResponders.getState().mark(conversationId, "bot");
      const tag = out.intent ? `[${INTENT_LABEL[out.intent]}] ` : "";
      log({ ...base, kind: "reply", detail: tag + text });

      // Upset customer / beyond what the bot knows: it answered politely, now a human takes over.
      const upset = out.sentiment === "negative" && out.intent === "complaint";
      if (persona.handoffNegative && (out.needsHuman || upset)) {
        const reason = upset ? "Khách không hài lòng / khiếu nại" : "Cần nhân viên xử lý";
        useDmBot.getState().pause(conversationId, name, reason);
        log({ ...base, kind: "handoff", detail: reason });
        notify(`${name} cần nhân viên`, reason, messagesLink(conversationId));
      }
    } catch (err) {
      log({ subject: name, conversationId, kind: "error", detail: getErrorMessage(err) });
    } finally {
      inFlight.current.delete(conversationId);
      qc.invalidateQueries({ queryKey: inboxKeys.all });
      qc.invalidateQueries({ queryKey: userKeys.usage });
    }
  });

  // Realtime: each incoming DM.
  useEffect(() => {
    if (!active) return;
    return onRealtimeEvent((e) => {
      if (e.event !== "dm.received") return;
      const id = (e.body.data as { conversation_id?: string } | undefined)?.conversation_id;
      if (id) void handle.current(id);
    });
  }, [active]);

  // Polling: conversations whose latest activity is newer than the bot's start.
  useEffect(() => {
    if (!active) return;
    const tick = async () => {
      const { enabledAt } = useDmBot.getState();
      if (!enabledAt) return;
      try {
        const page = await api.get<InboxPage<Conversation>>(
          `/inbox/conversations${toQuery({ status: "active", limit: RECENT_CONVERSATIONS })}`,
        );
        for (const c of page.data ?? []) {
          if (c.last_message_at && c.last_message_at > enabledAt) await handle.current(c.id);
        }
      } catch (err) {
        useDmBot
          .getState()
          .addLog({ kind: "error", subject: "Kiểm tra tin nhắn", detail: getErrorMessage(err) });
      }
    };
    void tick();
    const timer = setInterval(tick, realtime ? POLL_MS * 4 : POLL_MS);
    return () => clearInterval(timer);
  }, [active, realtime]);

  return null;
}

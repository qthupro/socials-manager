/**
 * AI reply suggestions for a DM thread, built on the shared AiProvider.
 * `buildConversationContext` normalises a thread into a model-friendly transcript;
 * it's also the input for future features (auto-reply, summaries, tagging…).
 */
import { getAiProvider, type AiMessage } from "@/shared/ai";
import { getPlatform } from "@/shared/config/platforms";

import { knowledgeBlock } from "../../knowledge/store";
import { customerKey } from "../lib/conversation";
import { useCustomers } from "../store/customers-store";
import type { Conversation, Message } from "../types";

export interface ConversationContext {
  platform: string;
  contactName: string;
  /** Oldest first. */
  transcript: { from: "customer" | "business"; text: string; at: string }[];
}

const MAX_TURNS = 30;

export function buildConversationContext(
  conversation: Conversation,
  messages: Message[],
): ConversationContext {
  return {
    platform: getPlatform(conversation.platform)?.label ?? conversation.platform,
    contactName:
      useCustomers.getState().customers[customerKey(conversation)]?.name ||
      conversation.participant_name ||
      "Khách hàng",
    transcript: messages
      .filter((m) => m.text && m.text !== "[Attachment]")
      .slice(-MAX_TURNS)
      .map((m) => ({
        from: m.direction === "incoming" ? "customer" : "business",
        text: m.text!,
        at: m.created_at,
      })),
  };
}

function toPrompt(ctx: ConversationContext, count: number): AiMessage[] {
  const transcript = ctx.transcript
    .map((t) => `${t.from === "customer" ? ctx.contactName : "Shop"}: ${t.text}`)
    .join("\n");
  return [
    {
      role: "system",
      content:
        "Bạn là nhân viên chăm sóc khách hàng, trả lời tin nhắn mạng xã hội thay cho doanh nghiệp. " +
        "Trả lời ngắn gọn, lịch sự, đúng ngôn ngữ khách dùng. Không bịa thông tin không có trong hội thoại." +
        knowledgeBlock("messages"),
    },
    {
      role: "user",
      content:
        `Hội thoại trên ${ctx.platform}:\n${transcript}\n\n` +
        `Đề xuất ${count} câu trả lời khác nhau cho tin nhắn mới nhất của khách. ` +
        "Mỗi câu một dòng, không đánh số, không giải thích.",
    },
  ];
}

export const isReplyAssistantAvailable = () => getAiProvider() !== null;

/** Returns up to `count` suggested replies; throws if no provider is configured. */
export async function suggestReplies(
  ctx: ConversationContext,
  count = 3,
  signal?: AbortSignal,
): Promise<string[]> {
  const provider = getAiProvider();
  if (!provider) throw new Error("Chưa cấu hình AI.");
  const out = await provider.complete(toPrompt(ctx, count), { maxTokens: 1024, signal });
  return out
    .split("\n")
    .map((l) => l.replace(/^[-*\d.)\s]+/, "").trim())
    .filter(Boolean)
    .slice(0, count);
}

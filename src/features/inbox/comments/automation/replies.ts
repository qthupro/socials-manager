/**
 * Picks the automatic reply for a comment: AI when configured (and chosen), otherwise
 * the first matching keyword rule, otherwise the default reply. `{name}` is replaced
 * with the commenter's name.
 */
import { getAiProvider } from "@/shared/ai";
import { getPlatform } from "@/shared/config/platforms";
import { notify } from "@/shared/platform/desktop";

import {
  buildBotSystemPrompt,
  parseBotOutput,
  useBotPersona,
  usesStructuredOutput,
} from "../../knowledge/persona";
import type { Comment, InboxPost } from "../types";
import type { AutomationSettings } from "./store";

export const fillTemplate = (template: string, c: Comment) =>
  template.replaceAll("{name}", c.author_name || c.author_username || "bạn").trim();

function matchRule(settings: AutomationSettings, c: Comment): string | undefined {
  const text = c.text.toLowerCase();
  const rule = settings.rules.find((r) =>
    r.keywords
      .split(",")
      .map((k) => k.trim().toLowerCase())
      .some((k) => k && text.includes(k)),
  );
  return rule?.reply ?? (settings.defaultReply || undefined);
}

/**
 * AI reply with the shared "AI staff" settings (persona, standards, context analysis).
 * An upset commenter is flagged with a desktop notification (the reply stays polite).
 */
async function aiReply(post: InboxPost | undefined, c: Comment): Promise<string | undefined> {
  const provider = getAiProvider();
  if (!provider) return undefined;
  const persona = useBotPersona.getState();
  const structured = usesStructuredOutput("comments", persona);
  const raw = await provider.complete(
    [
      { role: "system", content: buildBotSystemPrompt("comments") },
      {
        role: "user",
        content:
          `Kênh: ${getPlatform(c.platform)?.label ?? c.platform}\n` +
          (post?.content ? `Bài viết: ${post.content}\n` : "") +
          `Bình luận của ${c.author_name || "khách"}: ${c.text}`,
      },
    ],
    { maxTokens: 2048 },
  );
  // Unreadable structured output → no AI reply (falls back to templates), never raw JSON.
  const out = parseBotOutput(raw, structured);
  if (!out?.reply) return undefined;
  if (persona.handoffNegative && (out.needsHuman || out.sentiment === "negative")) {
    notify(
      `Bình luận cần chú ý: ${c.author_name || "khách"}`,
      c.text.slice(0, 120),
      "/inbox/comments",
    );
  }
  return out.reply;
}

export async function pickReply(
  settings: AutomationSettings,
  c: Comment,
  post?: InboxPost,
): Promise<string | undefined> {
  if (settings.replyMode === "ai") {
    const ai = await aiReply(post, c).catch(() => undefined);
    if (ai) return ai;
  }
  const template = matchRule(settings, c);
  return template ? fillTemplate(template, c) : undefined;
}

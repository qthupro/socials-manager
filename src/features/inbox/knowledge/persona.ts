/**
 * "AI staff" settings shared by the DM bot and the comment bot: personality, service
 * standards, context analysis and contact (phone / Zalo) collection — and the prompt
 * built from them.
 */
import { createPersistedStore } from "@/shared/lib/storage";

import { knowledgeBlock, type KnowledgeTab } from "./store";

export type Tone = "friendly" | "professional" | "enthusiastic" | "formal" | "playful";
export type ReplyLength = "short" | "medium" | "detailed";
export type EmojiLevel = "none" | "few" | "some";
export type AskContactWhen = "interested" | "early" | "before_end";

export const TONES: { value: Tone; label: string; prompt: string }[] = [
  { value: "friendly", label: "Thân thiện", prompt: "thân thiện, gần gũi, ấm áp" },
  {
    value: "professional",
    label: "Chuyên nghiệp",
    prompt: "chuyên nghiệp, rõ ràng, đúng trọng tâm",
  },
  { value: "enthusiastic", label: "Nhiệt tình", prompt: "nhiệt tình, chủ động tư vấn, tích cực" },
  { value: "formal", label: "Lịch sự trang trọng", prompt: "lịch sự, trang trọng, chuẩn mực" },
  { value: "playful", label: "Vui vẻ", prompt: "vui vẻ, dí dỏm nhưng vẫn lịch sự" },
];

export const LENGTHS: { value: ReplyLength; label: string; prompt: string }[] = [
  { value: "short", label: "Ngắn", prompt: "1–2 câu" },
  { value: "medium", label: "Vừa", prompt: "2–4 câu" },
  { value: "detailed", label: "Chi tiết", prompt: "đầy đủ khi cần, tối đa khoảng 6 câu" },
];

export const EMOJI: { value: EmojiLevel; label: string; prompt: string }[] = [
  { value: "none", label: "Không", prompt: "không dùng emoji" },
  { value: "few", label: "Ít", prompt: "tối đa 1 emoji mỗi tin" },
  { value: "some", label: "Vừa phải", prompt: "dùng emoji vừa phải cho sinh động" },
];

/** Built-in service rules the owner can tick. */
export const STANDARDS = [
  { id: "greet", label: "Chào khách khi bắt đầu hội thoại" },
  { id: "thank", label: "Cảm ơn khách đã quan tâm / phản hồi" },
  { id: "apologize", label: "Xin lỗi và đồng cảm khi khách phàn nàn" },
  { id: "noPromise", label: "Không hứa giảm giá, quà tặng ngoài chính sách" },
  { id: "noArgue", label: "Không tranh cãi, không đổ lỗi cho khách" },
  { id: "noCompetitor", label: "Không nhắc / so sánh với đối thủ" },
  { id: "openQuestion", label: "Kết thúc bằng một câu hỏi để giữ hội thoại" },
  { id: "noPriceComment", label: "Bình luận: không báo giá công khai, mời khách nhắn tin" },
] as const;
export type StandardId = (typeof STANDARDS)[number]["id"];

export const ASK_WHEN: { value: AskContactWhen; label: string; prompt: string }[] = [
  {
    value: "interested",
    label: "Khi khách quan tâm / muốn mua",
    prompt: "khi khách hỏi giá, hỏi chi tiết sản phẩm hoặc có ý định mua",
  },
  {
    value: "early",
    label: "Ngay đầu cuộc trò chuyện",
    prompt: "ngay từ tin nhắn đầu tiên, sau lời chào",
  },
  {
    value: "before_end",
    label: "Trước khi kết thúc tư vấn",
    prompt: "khi đã trả lời xong thắc mắc, trước khi kết thúc",
  },
];

export interface PersonaSettings {
  /** Name the staff introduces themselves with ("" = no name). */
  staffName: string;
  /** How the bot calls itself: em / mình / shop / tôi / chúng tôi. */
  selfPronoun: string;
  /** How it calls the customer; "auto" = follow how the customer writes. */
  customerPronoun: string;
  tone: Tone;
  length: ReplyLength;
  emoji: EmojiLevel;
  standards: StandardId[];
  greeting: string;
  closing: string;
  /** Words / topics never to mention. */
  forbidden: string;

  /** Classify intent + sentiment before replying (structured output). */
  analyzeContext: boolean;
  /** Angry / complaining customer → hand off to a human (DMs) or flag (comments). */
  handoffNegative: boolean;

  /** DMs: politely ask for phone / Zalo to consult further. */
  askContact: boolean;
  askContactWhen: AskContactWhen;
  askPhone: boolean;
  askZalo: boolean;
  askName: boolean;
  askAddress: boolean;
  /** Save phone / Zalo / name / address found in messages into the customer info. */
  saveContact: boolean;
  /** Comments: invite the commenter to message or leave a number. */
  commentInviteDm: boolean;
}

export const DEFAULT_PERSONA: PersonaSettings = {
  staffName: "",
  selfPronoun: "em",
  customerPronoun: "auto",
  tone: "friendly",
  length: "short",
  emoji: "few",
  standards: ["greet", "thank", "apologize", "noPromise", "noArgue", "noPriceComment"],
  greeting: "",
  closing: "",
  forbidden: "",
  analyzeContext: true,
  handoffNegative: true,
  askContact: true,
  askContactWhen: "interested",
  askPhone: true,
  askZalo: true,
  askName: false,
  askAddress: false,
  saveContact: true,
  commentInviteDm: true,
};

interface PersonaState extends PersonaSettings {
  save: (s: PersonaSettings) => void;
}

export const useBotPersona = createPersistedStore<PersonaState>(
  "bot-persona",
  (set) => ({ ...DEFAULT_PERSONA, save: (s) => set(s) }),
  { version: 1 },
);

export const pickPersona = (s: PersonaSettings): PersonaSettings => {
  const out = {} as PersonaSettings;
  for (const k of Object.keys(DEFAULT_PERSONA) as (keyof PersonaSettings)[]) {
    (out as unknown as Record<string, unknown>)[k] = s[k];
  }
  return out;
};

// ─── Prompt ──────────────────────────────────────────────────────────────────

export type Intent =
  "ask_price" | "ask_product" | "order" | "shipping" | "complaint" | "greeting" | "other";

export const INTENT_LABEL: Record<Intent, string> = {
  ask_price: "Hỏi giá",
  ask_product: "Hỏi sản phẩm",
  order: "Muốn đặt hàng",
  shipping: "Hỏi giao hàng",
  complaint: "Khiếu nại",
  greeting: "Chào hỏi",
  other: "Khác",
};

export interface BotOutput {
  reply: string;
  intent?: Intent;
  sentiment?: "positive" | "neutral" | "negative";
  needsHuman?: boolean;
  contact?: { phone?: string; zalo?: string; name?: string; address?: string };
}

/** What the bot already knows about this customer (so it doesn't ask twice). */
export interface KnownContact {
  phone?: string;
  zalo?: string;
  name?: string;
  address?: string;
}

/** True when the bot must answer in JSON (analysis and/or contact capture on). */
export function usesStructuredOutput(channel: KnowledgeTab, p = useBotPersona.getState()) {
  return p.analyzeContext || (channel === "messages" && p.saveContact);
}

/**
 * Full system prompt for a bot reply on one channel type: role + persona + standards +
 * business info + contact collection + output format.
 */
export function buildBotSystemPrompt(
  channel: KnowledgeTab,
  known: KnownContact = {},
  extra = "",
): string {
  const p = useBotPersona.getState();
  const tone = TONES.find((t) => t.value === p.tone)!.prompt;
  const length = LENGTHS.find((l) => l.value === p.length)!.prompt;
  const emoji = EMOJI.find((e) => e.value === p.emoji)!.prompt;
  const isDm = channel === "messages";

  const lines: string[] = [
    isDm
      ? "Bạn là nhân viên chăm sóc khách hàng, trả lời TIN NHẮN RIÊNG của khách thay cho doanh nghiệp."
      : "Bạn là nhân viên chăm sóc khách hàng, trả lời BÌNH LUẬN CÔNG KHAI của khách thay cho doanh nghiệp.",
    p.staffName ? `Tên bạn là ${p.staffName}.` : "",
    `Xưng "${p.selfPronoun}". ` +
      (p.customerPronoun === "auto"
        ? 'Gọi khách theo cách khách tự xưng (anh/chị/bạn…); chưa rõ thì gọi "anh/chị".'
        : `Gọi khách là "${p.customerPronoun}".`),
    `Giọng điệu: ${tone}. Độ dài: ${length}. Emoji: ${emoji}.`,
    "Trả lời đúng ngôn ngữ khách dùng. Không bịa thông tin; điều gì không có trong thông tin doanh nghiệp " +
      "(giá cụ thể, tồn kho, tình trạng đơn…) thì nói sẽ nhờ nhân viên kiểm tra và phản hồi sớm.",
  ];

  const rules = STANDARDS.filter((s) => p.standards.includes(s.id))
    .filter((s) => isDm || s.id !== "openQuestion")
    .filter((s) => !isDm || s.id !== "noPriceComment")
    .map((s) => `- ${s.label}`);
  if (p.greeting.trim() && isDm)
    rules.push(`- Câu chào mở đầu (khi mới bắt đầu hội thoại): "${p.greeting.trim()}"`);
  if (p.closing.trim()) rules.push(`- Câu kết thúc khi phù hợp: "${p.closing.trim()}"`);
  if (p.forbidden.trim()) rules.push(`- Tuyệt đối không nhắc tới: ${p.forbidden.trim()}`);
  if (rules.length) lines.push(`Chuẩn phục vụ:\n${rules.join("\n")}`);

  // Contact collection.
  if (isDm && p.askContact) {
    const wanted = [
      p.askPhone && !known.phone && "số điện thoại",
      p.askZalo && !known.zalo && "Zalo (thường trùng số điện thoại)",
      p.askName && !known.name && "tên",
      p.askAddress && !known.address && "địa chỉ nhận hàng",
    ].filter(Boolean);
    if (wanted.length) {
      const when = ASK_WHEN.find((w) => w.value === p.askContactWhen)!.prompt;
      lines.push(
        `Xin thông tin liên hệ: ${when}, hãy khéo léo xin ${wanted.join(", ")} của khách để nhân viên tư vấn kỹ hơn. ` +
          "Chỉ xin một lần, tự nhiên, không ép; khách đã từ chối thì không hỏi lại.",
      );
    }
  }
  const knownList = Object.entries(known)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`);
  if (knownList.length)
    lines.push(`Đã có thông tin của khách (không hỏi lại): ${knownList.join(", ")}.`);
  if (!isDm && p.commentInviteDm) {
    lines.push(
      "Với câu hỏi cần tư vấn chi tiết, mời khách nhắn tin riêng cho trang hoặc để lại số điện thoại.",
    );
  }

  if (extra.trim()) lines.push(`Hướng dẫn thêm từ chủ shop:\n${extra.trim()}`);

  // Output format.
  if (usesStructuredOutput(channel, p)) {
    lines.push(
      "TRẢ VỀ DUY NHẤT một object JSON (không markdown, không giải thích) dạng:\n" +
        '{"reply": "câu trả lời gửi khách", "intent": "ask_price|ask_product|order|shipping|complaint|greeting|other", ' +
        '"sentiment": "positive|neutral|negative", "needs_human": true|false, ' +
        '"contact": {"phone": "", "zalo": "", "name": "", "address": ""}}\n' +
        "needs_human = true khi khách giận dữ, khiếu nại nghiêm trọng, đòi gặp người thật, hoặc câu hỏi vượt quá thông tin có sẵn. " +
        "contact: chỉ điền thông tin KHÁCH đã tự cung cấp trong hội thoại, không đoán.",
    );
  } else {
    lines.push("Chỉ trả về nội dung câu trả lời gửi khách, không giải thích.");
  }

  return lines.filter(Boolean).join("\n\n") + knowledgeBlock(channel);
}

const INTENTS = Object.keys(INTENT_LABEL) as Intent[];

/**
 * Reads the model's answer. Structured mode: the JSON object (tolerating code fences or
 * text around it). If JSON was expected but can't be read, returns null — never send raw
 * JSON to a customer.
 */
export function parseBotOutput(raw: string, structured: boolean): BotOutput | null {
  const text = raw.trim();
  if (!structured) return text ? { reply: text } : null;
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const j = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
    const reply = typeof j.reply === "string" ? j.reply.trim() : "";
    const c = (j.contact ?? {}) as Record<string, unknown>;
    const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
    return {
      reply,
      intent: INTENTS.includes(j.intent as Intent) ? (j.intent as Intent) : undefined,
      sentiment: ["positive", "neutral", "negative"].includes(j.sentiment as string)
        ? (j.sentiment as BotOutput["sentiment"])
        : undefined,
      needsHuman: j.needs_human === true,
      contact: {
        phone: str(c.phone),
        zalo: str(c.zalo),
        name: str(c.name),
        address: str(c.address),
      },
    };
  } catch {
    return null;
  }
}

/** Vietnamese mobile numbers written by the customer (0xx / +84xx, spaces / dots allowed). */
export function findPhones(text: string): string[] {
  const out = new Set<string>();
  for (const m of text.matchAll(/(?:\+?84|0)[\s.-]?(?:3|5|7|8|9)(?:[\s.-]?\d){8}\b/g)) {
    const digits = m[0].replace(/[^\d+]/g, "").replace(/^\+?84/, "0");
    if (/^0\d{9}$/.test(digits)) out.add(digits);
  }
  return [...out];
}

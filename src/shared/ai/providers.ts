/**
 * The four AI backends. Claude goes through the official Anthropic SDK; ChatGPT, Gemini
 * and DeepSeek through their own REST APIs. All requests use the Tauri HTTP client
 * (no webview CORS); hosts are allowed in src-tauri/capabilities/default.json.
 */
import Anthropic from "@anthropic-ai/sdk";

import { httpFetch } from "@/shared/platform/http";

import type { AiProviderId } from "./config";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface StreamOptions {
  apiKey: string;
  model: string;
  maxTokens?: number;
  signal?: AbortSignal;
  /** Called with each new piece of text as it streams in. */
  onText?: (delta: string) => void;
}

/** A model the user's key can use. */
export interface ModelInfo {
  id: string;
  /** Human name when the API gives one, e.g. "Claude Opus 5.5". */
  name?: string;
  /** Release / creation time (ms) when known — newest are listed first. */
  created?: number;
  description?: string;
}

export interface ProviderInfo {
  id: AiProviderId;
  label: string;
  vendor: string;
  /** Where users create a key. */
  keyUrl: string;
  keyPlaceholder: string;
  /** Used when the user hasn't picked a model. Empty = must pick from the list. */
  defaultModel: string;
  /** Text-generation models only, newest first. */
  listModels: (apiKey: string) => Promise<ModelInfo[]>;
  stream: (messages: ChatMessage[], options: StreamOptions) => Promise<string>;
}

const DEFAULT_MAX_TOKENS = 4096;

/** Splits system messages (sent separately by Claude / Gemini) from the conversation. */
function splitSystem(messages: ChatMessage[]) {
  const system = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n");
  return { system, turns: messages.filter((m) => m.role !== "system") };
}

async function failure(res: Response, vendor: string): Promise<Error> {
  const text = await res.text().catch(() => "");
  let message = text;
  try {
    const data = JSON.parse(text) as { error?: { message?: string } | string; message?: string };
    message =
      (typeof data.error === "string" ? data.error : data.error?.message) || data.message || text;
  } catch {
    // not JSON
  }
  if (res.status === 401 || res.status === 403)
    return new Error(`${vendor}: API key không hợp lệ hoặc không đủ quyền.`);
  if (res.status === 429)
    return new Error(`${vendor}: vượt giới hạn hoặc hết hạn mức — thử lại sau.`);
  return new Error(`${vendor}: ${message || `HTTP ${res.status}`}`);
}

/** Newest first; models without a date keep their order after dated ones, by id (newer versions first). */
function sortModels(models: ModelInfo[]): ModelInfo[] {
  return [...models].sort(
    (a, b) =>
      (b.created ?? 0) - (a.created ?? 0) || b.id.localeCompare(a.id, undefined, { numeric: true }),
  );
}

/** Reads a text/event-stream body, calling `onData` with each `data:` payload. */
async function readSse(res: Response, onData: (data: string) => void) {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (line.startsWith("data:")) onData(line.slice(5).trim());
    }
  }
}

// ─── Claude (Anthropic SDK) ──────────────────────────────────────────────────

const claudeClient = (apiKey: string) =>
  new Anthropic({
    apiKey,
    fetch: httpFetch,
    // The key belongs to the user of this desktop app and stays on their machine.
    dangerouslyAllowBrowser: true,
  });

/** Current-generation models: effort is tuned explicitly (chat-style work → medium). */
const supportsEffort = (model: string) =>
  /^claude-(opus-5|sonnet-5|fable-5|haiku-5|opus-4-[678]|sonnet-4-6)/.test(model);
/** Models that accept server-side refusal fallbacks (`fallbacks: "default"`). */
const supportsFallbacks = (model: string) => /^claude-(opus-5|fable-5-1|sonnet-5-5)/.test(model);

const claude: ProviderInfo = {
  id: "claude",
  label: "Claude",
  vendor: "Anthropic",
  keyUrl: "https://platform.claude.com/settings/keys",
  keyPlaceholder: "sk-ant-…",
  defaultModel: "claude-opus-5-5",
  async listModels(apiKey) {
    const models: ModelInfo[] = [];
    for await (const m of claudeClient(apiKey).models.list({ limit: 1000 })) {
      models.push({
        id: m.id,
        name: m.display_name,
        created: Date.parse(m.created_at) || undefined,
      });
    }
    return sortModels(models);
  },
  async stream(messages, { apiKey, model, maxTokens = DEFAULT_MAX_TOKENS, signal, onText }) {
    const { system, turns } = splitSystem(messages);
    const fallbacks = supportsFallbacks(model);
    try {
      const stream = claudeClient(apiKey).beta.messages.stream(
        {
          model,
          max_tokens: maxTokens,
          ...(system && { system }),
          messages: turns.map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
          ...(supportsEffort(model) && { output_config: { effort: "medium" } }),
          // On a policy decline, the API re-runs the request on a fallback model.
          ...(fallbacks && { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" }),
        },
        { signal },
      );
      if (onText) stream.on("text", (delta) => onText(delta));
      const message = await stream.finalMessage();
      if (message.stop_reason === "refusal") {
        throw new Error("Claude từ chối yêu cầu này (chính sách an toàn). Thử diễn đạt khác.");
      }
      return message.content
        .map((b) => (b.type === "text" ? b.text : ""))
        .join("")
        .trim();
    } catch (err) {
      if (err instanceof Anthropic.AuthenticationError) {
        throw new Error("Claude: API key không hợp lệ.", { cause: err });
      } else if (err instanceof Anthropic.PermissionDeniedError) {
        throw new Error("Claude: key không có quyền dùng model này.", { cause: err });
      } else if (err instanceof Anthropic.NotFoundError) {
        throw new Error(`Claude: không tìm thấy model “${model}”.`, { cause: err });
      } else if (err instanceof Anthropic.RateLimitError) {
        throw new Error("Claude: vượt giới hạn tốc độ — thử lại sau.", { cause: err });
      } else if (err instanceof Anthropic.APIError) {
        throw new Error(`Claude: ${err.message}`, { cause: err });
      }
      throw err;
    }
  },
};

// ─── ChatGPT / DeepSeek (OpenAI-style chat completions) ──────────────────────

/** /models also returns embedding, speech, image, moderation… models that can't chat. */
const NON_CHAT_MODEL =
  /embed|whisper|tts|transcribe|dall-e|image|audio|realtime|moderation|davinci|babbage|sora|search|computer-use/i;

function chatCompletions(
  meta: Omit<ProviderInfo, "listModels" | "stream">,
  baseUrl: string,
  /** OpenAI: max_completion_tokens; DeepSeek: max_tokens. */
  tokensParam: "max_completion_tokens" | "max_tokens",
): ProviderInfo {
  return {
    ...meta,
    async listModels(apiKey) {
      const res = await httpFetch(`${baseUrl}/models`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) throw await failure(res, meta.label);
      const data = (await res.json()) as { data?: { id: string; created?: number }[] };
      return sortModels(
        (data.data ?? [])
          .filter((m) => !NON_CHAT_MODEL.test(m.id))
          .map((m) => ({ id: m.id, created: m.created ? m.created * 1000 : undefined })),
      );
    },
    async stream(messages, { apiKey, model, maxTokens = DEFAULT_MAX_TOKENS, signal, onText }) {
      const res = await httpFetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        signal,
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages,
          stream: true,
          [tokensParam]: maxTokens,
        }),
      });
      if (!res.ok) throw await failure(res, meta.label);
      let text = "";
      await readSse(res, (data) => {
        if (data === "[DONE]") return;
        try {
          const delta = (JSON.parse(data) as { choices?: { delta?: { content?: string } }[] })
            .choices?.[0]?.delta?.content;
          if (delta) {
            text += delta;
            onText?.(delta);
          }
        } catch {
          // keep-alive / partial line
        }
      });
      return text.trim();
    },
  };
}

const openai = chatCompletions(
  {
    id: "openai",
    label: "ChatGPT",
    vendor: "OpenAI",
    keyUrl: "https://platform.openai.com/api-keys",
    keyPlaceholder: "sk-…",
    defaultModel: "",
  },
  "https://api.openai.com/v1",
  "max_completion_tokens",
);

const deepseek = chatCompletions(
  {
    id: "deepseek",
    label: "DeepSeek",
    vendor: "DeepSeek",
    keyUrl: "https://platform.deepseek.com/api_keys",
    keyPlaceholder: "sk-…",
    defaultModel: "deepseek-chat",
  },
  "https://api.deepseek.com",
  "max_tokens",
);

// ─── Gemini (Google AI) ──────────────────────────────────────────────────────

const GEMINI = "https://generativelanguage.googleapis.com/v1beta";

const gemini: ProviderInfo = {
  id: "gemini",
  label: "Gemini",
  vendor: "Google",
  keyUrl: "https://aistudio.google.com/apikey",
  keyPlaceholder: "AIza…",
  defaultModel: "",
  async listModels(apiKey) {
    type GeminiModel = {
      name: string;
      displayName?: string;
      description?: string;
      supportedGenerationMethods?: string[];
    };
    const all: GeminiModel[] = [];
    let pageToken = "";
    do {
      const res = await httpFetch(
        `${GEMINI}/models?pageSize=1000${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ""}`,
        { headers: { "x-goog-api-key": apiKey } },
      );
      if (!res.ok) throw await failure(res, "Gemini");
      const data = (await res.json()) as { models?: GeminiModel[]; nextPageToken?: string };
      all.push(...(data.models ?? []));
      pageToken = data.nextPageToken ?? "";
    } while (pageToken);
    return sortModels(
      all
        .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
        .map((m) => ({
          id: m.name.replace(/^models\//, ""),
          name: m.displayName,
          description: m.description,
        }))
        .filter((m) => !/embed|aqa|imagen|veo|tts|image|audio/i.test(m.id)),
    );
  },
  async stream(messages, { apiKey, model, maxTokens = DEFAULT_MAX_TOKENS, signal, onText }) {
    const { system, turns } = splitSystem(messages);
    const res = await httpFetch(
      `${GEMINI}/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`,
      {
        method: "POST",
        signal,
        headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(system && { systemInstruction: { parts: [{ text: system }] } }),
          contents: turns.map((m) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }],
          })),
          generationConfig: { maxOutputTokens: maxTokens },
        }),
      },
    );
    if (!res.ok) throw await failure(res, "Gemini");
    let text = "";
    let blocked = false;
    await readSse(res, (data) => {
      try {
        const json = JSON.parse(data) as {
          candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
          promptFeedback?: { blockReason?: string };
        };
        if (json.promptFeedback?.blockReason) blocked = true;
        const delta = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("");
        if (delta) {
          text += delta;
          onText?.(delta);
        }
      } catch {
        // partial line
      }
    });
    if (!text && blocked) throw new Error("Gemini chặn yêu cầu này (chính sách an toàn).");
    return text.trim();
  },
};

export const PROVIDERS: Record<AiProviderId, ProviderInfo> = { claude, openai, gemini, deepseek };

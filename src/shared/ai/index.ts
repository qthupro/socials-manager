/**
 * App-wide AI. Features (auto-replies, post writing, reply suggestions) talk to an
 * `AiProvider`; the active one comes from the user's settings (Settings → AI): one of
 * Claude, ChatGPT, Gemini or DeepSeek, with the user's own API key. Business info for the
 * auto-reply bots lives with them (features/inbox/knowledge), not here.
 */
import { AI_PROVIDER_IDS, useAiConfig, type AiProviderId } from "./config";
import { PROVIDERS, type ChatMessage } from "./providers";

export { AI_PROVIDER_IDS, useAiConfig, type AiProviderId } from "./config";
export { PROVIDERS, type ModelInfo, type ProviderInfo } from "./providers";
export { AiProviderIcon } from "./provider-icon";

export type AiMessage = ChatMessage;

export interface AiCompleteOptions {
  maxTokens?: number;
  signal?: AbortSignal;
  /** Stream text as it arrives. */
  onText?: (delta: string) => void;
}

export interface AiProvider {
  id: string;
  /** Shown in the UI, e.g. "Claude". */
  label: string;
  /** Model actually used. */
  model: string;
  complete(messages: AiMessage[], options?: AiCompleteOptions): Promise<string>;
}

/** Model to use for a provider: the user's choice, else the provider default. */
export const modelFor = (id: AiProviderId) =>
  useAiConfig.getState().models[id] || PROVIDERS[id].defaultModel;

/** A provider built from the user's settings, or null when AI isn't set up. */
export function getAiProvider(): AiProvider | null {
  const { active, keys } = useAiConfig.getState();
  if (!active) return null;
  const apiKey = keys[active];
  const model = modelFor(active);
  if (!apiKey || !model) return null;
  const info = PROVIDERS[active];
  return {
    id: active,
    label: info.label,
    model,
    complete: (messages, options) => info.stream(messages, { apiKey, model, ...options }),
  };
}

/** True when AI features can run (re-renders when settings change). */
export function useAiReady() {
  return useAiConfig((s) => {
    if (!s.active) return false;
    return !!s.keys[s.active] && !!(s.models[s.active] || PROVIDERS[s.active].defaultModel);
  });
}

export const aiProviderIds = AI_PROVIDER_IDS;

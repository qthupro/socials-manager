/**
 * AI settings — each user brings their own key for one of four providers. Keys stay on
 * this machine (localStorage, like the SocialAPI key) and are sent only to that
 * provider's API, through the app's Rust HTTP client.
 */
import { createPersistedStore } from "@/shared/lib/storage";

export type AiProviderId = "claude" | "openai" | "gemini" | "deepseek";

export const AI_PROVIDER_IDS: AiProviderId[] = ["claude", "openai", "gemini", "deepseek"];

interface AiConfigState {
  /** Provider every AI feature uses (null = AI off). */
  active: AiProviderId | null;
  keys: Partial<Record<AiProviderId, string>>;
  /** Chosen model per provider (empty = provider default). */
  models: Partial<Record<AiProviderId, string>>;
  set: (patch: Partial<Omit<AiConfigState, "set" | "setKey" | "setModel">>) => void;
  setKey: (id: AiProviderId, key: string) => void;
  setModel: (id: AiProviderId, model: string) => void;
}

export const useAiConfig = createPersistedStore<AiConfigState>(
  "ai",
  (set) => ({
    active: null,
    keys: {},
    models: {},
    set: (patch) => set(patch),
    setKey: (id, key) => set((s) => ({ keys: { ...s.keys, [id]: key.trim() } })),
    setModel: (id, model) => set((s) => ({ models: { ...s.models, [id]: model.trim() } })),
  }),
  // A stored `businessInfo` from older builds is left alone: inbox/knowledge reads it once
  // to carry it over to the auto-reply settings.
  { version: 1 },
);

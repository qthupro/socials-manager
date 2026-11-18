import { createPersistedStore } from "@/shared/lib/storage";

interface ApiKeyState {
  apiKey: string;
  setApiKey: (apiKey: string) => void;
}

/** The user's SocialAPI key, kept in localStorage on this machine only. */
export const useApiKey = createPersistedStore<ApiKeyState>(
  "api-key",
  (set) => ({
    apiKey: "",
    setApiKey: (apiKey) => set({ apiKey: apiKey.trim() }),
  }),
  { version: 1 },
);

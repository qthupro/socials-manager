import { createPersistedStore } from "@/shared/lib/storage";

export type Theme = "light" | "dark";

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const useTheme = createPersistedStore<ThemeState>(
  "theme",
  (set) => ({
    theme: "light",
    setTheme: (theme) => set({ theme }),
    toggleTheme: () => set((s) => ({ theme: s.theme === "dark" ? "light" : "dark" })),
  }),
  { version: 1 },
);

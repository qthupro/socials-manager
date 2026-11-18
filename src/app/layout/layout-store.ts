import { createPersistedStore } from "@/shared/lib/storage";

interface LayoutState {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  /** Sidebar dropdown groups that are expanded. */
  openNavGroups: string[];
  setNavGroupOpen: (group: string, open: boolean) => void;
}

/** Shell UI preferences, remembered across restarts. */
export const useLayoutStore = createPersistedStore<LayoutState>(
  "layout",
  (set) => ({
    sidebarOpen: true,
    setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
    openNavGroups: [],
    setNavGroupOpen: (group, open) =>
      set((s) => ({
        openNavGroups: open
          ? [...new Set([...s.openNavGroups, group])]
          : s.openNavGroups.filter((g) => g !== group),
      })),
  }),
  // Adding a field with a default needs no version bump: it's filled in on hydrate.
  { version: 1 },
);

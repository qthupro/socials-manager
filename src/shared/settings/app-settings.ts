import { createPersistedStore } from "@/shared/lib/storage";

interface AppSettingsState {
  /** Closing the window hides it to the system tray instead of quitting. */
  runInBackground: boolean;
  /** OS notification when a new message arrives while the app isn't focused. */
  notifyNewMessages: boolean;
  set: (patch: Partial<Omit<AppSettingsState, "set">>) => void;
}

/**
 * Desktop behaviour preferences. (Start-at-login isn't stored here — the OS
 * registration is the source of truth, read through the autostart plugin.)
 */
export const useAppSettings = createPersistedStore<AppSettingsState>(
  "app-settings",
  (set) => ({
    runInBackground: true,
    notifyNewMessages: true,
    set: (patch) => set(patch),
  }),
  { version: 1 },
);

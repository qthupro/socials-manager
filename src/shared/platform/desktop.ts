/**
 * Desktop integration (tray, autostart, notifications, window). No-ops outside Tauri
 * so the UI still runs with plain `pnpm dev`.
 */
import { invoke, isTauri } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  disable as disableAutostart,
  enable as enableAutostart,
  isEnabled as isAutostartEnabled,
} from "@tauri-apps/plugin-autostart";

export const isDesktop = isTauri;

/** Turns close-to-tray on/off in the Rust side (also shows/hides the tray icon). */
export async function setCloseToTray(enabled: boolean) {
  if (isTauri()) await invoke("set_close_to_tray", { enabled });
}

/** True when the OS started the app at login. */
export async function launchedAtLogin(): Promise<boolean> {
  return isTauri() ? invoke<boolean>("launched_at_login") : false;
}

export async function showMainWindow() {
  if (!isTauri()) return;
  const win = getCurrentWindow();
  await win.unminimize();
  await win.show();
  await win.setFocus();
}

/** Whether the user is looking at the app right now. */
export async function isAppFocused(): Promise<boolean> {
  if (!isTauri()) return document.hasFocus();
  const win = getCurrentWindow();
  return (await win.isVisible()) && (await win.isFocused());
}

export const autostart = {
  isEnabled: async () => (isTauri() ? isAutostartEnabled() : false),
  set: async (enabled: boolean) => {
    if (!isTauri()) return;
    if (enabled) await enableAutostart();
    else await disableAutostart();
  },
};

/**
 * Shows an OS notification (bottom-right toast on Windows, as "Social Manager";
 * clicking it opens the app). Resolves to an error message, or null when shown.
 * Implemented in Rust: src-tauri/src/notifications.rs.
 */
export async function notify(
  title: string,
  body: string,
  /** In-app route opened when the notification is clicked. */
  link?: string,
): Promise<string | null> {
  if (!isTauri()) return "Chỉ có trên ứng dụng desktop.";
  try {
    await invoke("show_notification", { title, body, link: link ?? null });
    return null;
  } catch (err) {
    console.error("notify failed", err);
    return String(err);
  }
}

/** A notification was clicked; link is the route it carries (null = just open the app). */
export function onNotificationClick(handler: (link: string | null) => void): Promise<UnlistenFn> {
  if (!isTauri()) return Promise.resolve(() => {});
  return listen<string | null>("notification://clicked", (e) => handler(e.payload));
}

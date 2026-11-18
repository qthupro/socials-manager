import { isTauri } from "@tauri-apps/api/core";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";

/**
 * `fetch` that runs through Rust inside the app (no webview CORS),
 * and falls back to the browser's fetch under plain `pnpm dev`.
 * Allowed hosts are listed in src-tauri/capabilities/default.json.
 */
export const httpFetch: typeof fetch = (input, init) =>
  isTauri() ? tauriFetch(input, init) : window.fetch(input, init);

import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useState } from "react";

/**
 * Controls for the frameless main window.
 * Outside Tauri (plain `pnpm dev` in a browser) `available` is false and the actions are no-ops.
 */
export function useWindowControls() {
  const available = isTauri();
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    if (!available) return;
    const win = getCurrentWindow();
    const sync = () => win.isMaximized().then(setMaximized);
    sync();
    const unlisten = win.onResized(sync);
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [available]);

  return {
    available,
    maximized,
    minimize: () => available && getCurrentWindow().minimize(),
    toggleMaximize: () => available && getCurrentWindow().toggleMaximize(),
    close: () => available && getCurrentWindow().close(),
  };
}

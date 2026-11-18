import { useEffect } from "react";
import { useNavigate } from "react-router";

import {
  launchedAtLogin,
  onNotificationClick,
  setCloseToTray,
  showMainWindow,
} from "@/shared/platform/desktop";
import { useAppSettings } from "@/shared/settings/app-settings";

/**
 * Glue between the desktop shell (Rust) and the UI. Renders nothing.
 *  - pushes "run in background" to Rust,
 *  - shows the window after an autostart when there'd be no tray icon to reach it,
 *  - opens the route a clicked notification points to.
 */
export function DesktopBridge() {
  const navigate = useNavigate();
  const runInBackground = useAppSettings((s) => s.runInBackground);

  useEffect(() => {
    setCloseToTray(runInBackground).catch(() => {});
  }, [runInBackground]);

  useEffect(() => {
    launchedAtLogin()
      .then((atLogin) => {
        if (atLogin && !useAppSettings.getState().runInBackground) return showMainWindow();
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const unlisten = onNotificationClick((link) => {
      if (link) navigate(link);
    });
    return () => {
      unlisten.then((off) => off());
    };
  }, [navigate]);

  return null;
}

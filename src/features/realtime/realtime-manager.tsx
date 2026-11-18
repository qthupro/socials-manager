import { useEffect, useRef, useState } from "react";

import { getErrorMessage, useApiKey } from "@/shared/api";
import { publishRealtimeEvent, setRealtimeStatus, useRealtimeStatus } from "@/shared/realtime";

import { webhooksApi } from "./api";
import { deployBackend } from "./backend/deploy";
import { subscribeEvents } from "./backend/events";
import { BACKEND_VERSION } from "./backend/version";
import { ensureWebhook, hookPath, pauseWebhook } from "./lifecycle";
import { useRealtimeConfig } from "./store";

/** No step may hang the "starting" state forever. */
const STEP_TIMEOUT_MS = 45_000;
/** Redeploying the backend can take longer (schema check). */
const DEPLOY_TIMEOUT_MS = 5 * 60_000;
/** Retry after a failure: 15 s, 30 s, 1 min … capped at 5 min. */
const RETRY_BASE_MS = 15_000;
const RETRY_MAX_MS = 5 * 60_000;
/** End-to-end check (signed test delivery through Convex) while online. */
const HEALTH_MS = 5 * 60_000;
/** Heartbeat used to notice the machine slept (timers stop while asleep). */
const HEARTBEAT_MS = 20_000;
const SLEEP_GAP_MS = 60_000;

function withTimeout<T>(promise: Promise<T>, what: string, ms = STEP_TIMEOUT_MS): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Hết thời gian chờ: ${what}`)), ms),
    ),
  ]);
}

/**
 * Runs realtime mode whenever it's enabled — on app start too, no re-toggle needed:
 * SocialAPI → webhook → the user's own Convex deployment → WebSocket → events published.
 * Redeploys the backend when the app ships a newer one. Recovers by itself after
 * failures, sleep / resume and network changes. When off or failing, features keep
 * polling. Renders nothing.
 */
export function RealtimeManager() {
  const enabled = useRealtimeConfig((s) => s.enabled);
  const deployKey = useRealtimeConfig((s) => s.deployKey);
  const backendUrl = useRealtimeConfig((s) => s.backend?.url);
  const siteUrl = useRealtimeConfig((s) => s.backend?.siteUrl);
  const readToken = useRealtimeConfig((s) => s.backend?.readToken);
  const installId = useRealtimeConfig((s) => s.installId);
  const apiKey = useApiKey((s) => s.apiKey);
  const state = useRealtimeStatus((s) => s.state);
  const url = useRealtimeStatus((s) => s.url);

  /** Bumping this reconnects. */
  const [attempt, setAttempt] = useState(0);
  const running = useRef(false);
  const failures = useRef(0);
  const retryTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const active = enabled && !!deployKey && !!backendUrl && !!siteUrl && !!readToken && !!apiKey;

  const restart = () => {
    clearTimeout(retryTimer.current);
    setAttempt((n) => n + 1);
  };

  const scheduleRetry = (reason: string) => {
    const delay = Math.min(RETRY_BASE_MS * 2 ** failures.current, RETRY_MAX_MS);
    failures.current += 1;
    setRealtimeStatus({
      state: "error",
      error: `${reason} — tự thử lại sau ${Math.round(delay / 1000)} giây.`,
    });
    clearTimeout(retryTimer.current);
    retryTimer.current = setTimeout(restart, delay);
  };

  // Connect / disconnect following the saved configuration (and on every restart).
  useEffect(() => {
    if (!active || !backendUrl || !siteUrl || !readToken) {
      clearTimeout(retryTimer.current);
      failures.current = 0;
      if (running.current) {
        running.current = false;
        // Switched off: stop SocialAPI from retrying against an unused receiver.
        if (!enabled) pauseWebhook().catch(() => {});
      }
      setRealtimeStatus({ state: "off" });
      return;
    }

    let cancelled = false;
    let close: (() => void) | undefined;
    setRealtimeStatus({ state: "starting" });
    (async () => {
      try {
        // App updated with a newer backend: redeploy it (same deployment, same token).
        const { backend } = useRealtimeConfig.getState();
        if (backend && backend.version !== BACKEND_VERSION) {
          const result = await withTimeout(
            deployBackend(deployKey, { readToken }),
            "cập nhật backend trên Convex",
            DEPLOY_TIMEOUT_MS,
          );
          const current = useRealtimeConfig.getState().backend;
          if (current)
            useRealtimeConfig.getState().set({ backend: { ...current, version: result.version } });
        }
        if (cancelled) return;

        close = await withTimeout(
          subscribeEvents(backendUrl, readToken, publishRealtimeEvent, (err) =>
            scheduleRetry(getErrorMessage(err)),
          ),
          "kết nối Convex (kiểm tra mạng / deploy lại)",
        );
        if (cancelled) return close();
        running.current = true;

        const hookUrl = siteUrl + hookPath(installId);
        await withTimeout(ensureWebhook(hookUrl), "đăng ký webhook trên SocialAPI");
        if (cancelled) return;
        failures.current = 0;
        setRealtimeStatus({ state: "online", url: hookUrl });
      } catch (err) {
        if (cancelled) return;
        close?.();
        close = undefined;
        scheduleRetry(getErrorMessage(err));
      }
    })();
    return () => {
      cancelled = true;
      close?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, enabled, deployKey, backendUrl, siteUrl, readToken, installId, apiKey, attempt]);

  // Woke from sleep (timers paused → big gap) or network came back: reconnect.
  useEffect(() => {
    if (!active) return;
    let last = Date.now();
    const beat = setInterval(() => {
      const now = Date.now();
      if (now - last > SLEEP_GAP_MS) restart();
      last = now;
    }, HEARTBEAT_MS);
    const onOnline = () => restart();
    window.addEventListener("online", onOnline);
    return () => {
      clearInterval(beat);
      window.removeEventListener("online", onOnline);
    };
  }, [active]);

  // While online: the webhook must exist, be active, AND actually reach Convex.
  useEffect(() => {
    if (state !== "online" || !url) return;
    const timer = setInterval(async () => {
      try {
        const hook = await ensureWebhook(url);
        const test = await webhooksApi.test(hook.id);
        if (test.status !== "delivered") {
          scheduleRetry(`Webhook không tới được Convex (HTTP ${test.response_status_code || "—"})`);
        }
      } catch (err) {
        scheduleRetry(getErrorMessage(err));
      }
    }, HEALTH_MS);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, url]);

  return null;
}

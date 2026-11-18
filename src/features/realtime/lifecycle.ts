/**
 * Webhook lifecycle for realtime mode:
 *  - reuse this install's webhook (same API key) and keep its URL/events/active flag in sync,
 *  - recreate it if it was deleted on SocialAPI (404),
 *  - clean up stale webhooks left by this install,
 *  - pause it (is_active=false) when realtime is turned off, so SocialAPI stops retrying
 *    against a dead URL.
 */
import { ApiError, useApiKey } from "@/shared/api";

import { WEBHOOK_EVENTS, webhooksApi } from "./api";
import { setDeploymentEnv } from "./backend/deploy";
import { keyFingerprint, useRealtimeConfig, type RegisteredWebhook } from "./store";

export const hookPath = (installId: string) => `/hook/${installId}`;

/**
 * Sets the secret the Convex receiver verifies deliveries with (WEBHOOK_SECRET on the
 * user's deployment); null = acknowledge without processing. Skipped when already set.
 */
async function setWebhookSecret(hook: RegisteredWebhook | null) {
  const { backend, deployKey, set } = useRealtimeConfig.getState();
  if (!backend || !deployKey) return;
  if (hook && backend.secretHookId === hook.id) return;
  await setDeploymentEnv(backend, deployKey, { WEBHOOK_SECRET: hook?.secret ?? null });
  set({ backend: { ...backend, secretHookId: hook?.id ?? null } });
}

const sameEvents = (a: string[] | null) =>
  !!a && a.length === WEBHOOK_EVENTS.length && WEBHOOK_EVENTS.every((e) => a.includes(e));

/** Makes sure an active webhook points at `url`; loads its secret into the receiver. */
export async function ensureWebhook(url: string): Promise<RegisteredWebhook> {
  const config = useRealtimeConfig.getState();
  const fp = keyFingerprint(useApiKey.getState().apiKey);
  let hook = config.webhook?.keyFingerprint === fp ? config.webhook : null;

  if (hook) {
    try {
      const current = await webhooksApi.get(hook.id);
      if (current.url !== url || !current.is_active || !sameEvents(current.events)) {
        await webhooksApi.update(hook.id, { url, is_active: true, events: WEBHOOK_EVENTS });
      }
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 404)) throw err;
      hook = null; // Deleted on SocialAPI — register again.
    }
  }

  if (!hook) {
    // Acknowledge SocialAPI's reachability check while there's no secret yet.
    await setWebhookSecret(null);
    const created = await webhooksApi.create(url);
    hook = { id: created.id, secret: created.secret, keyFingerprint: fp };
    useRealtimeConfig.getState().set({ webhook: hook });
  }

  await setWebhookSecret(hook);
  await removeStaleWebhooks(hook.id).catch(() => {});
  return hook;
}

/** Deletes other webhooks this install created earlier (same /hook/<installId> path). */
async function removeStaleWebhooks(keepId: string) {
  const path = hookPath(useRealtimeConfig.getState().installId);
  const all = await webhooksApi.list();
  await Promise.allSettled(
    all.filter((w) => w.id !== keepId && w.url.endsWith(path)).map((w) => webhooksApi.remove(w.id)),
  );
}

/** Realtime turned off: stop deliveries but keep the webhook for next time. */
export async function pauseWebhook() {
  const hook = useRealtimeConfig.getState().webhook;
  if (hook) await webhooksApi.update(hook.id, { is_active: false });
}

/** Removes the webhook from SocialAPI and forgets it locally. */
export async function deleteWebhook() {
  const hook = useRealtimeConfig.getState().webhook;
  if (hook) {
    try {
      await webhooksApi.remove(hook.id);
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 404)) throw err;
    }
  }
  useRealtimeConfig.getState().set({ webhook: null });
  await setWebhookSecret(null).catch(() => {});
}

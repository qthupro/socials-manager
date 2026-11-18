/**
 * Public API of the realtime feature — optional webhook delivery through the user's
 * own Convex deployment (convex/, deployed from the app with their deploy key).
 * No route; a settings section and a background manager.
 */
import { useRealtimeConfig } from "./store";

export { deleteWebhook as deleteRealtimeWebhook } from "./lifecycle";
export { RealtimeManager } from "./realtime-manager";
export { RealtimeSection } from "./realtime-section";

/** Id of the webhook realtime mode manages (it resets that webhook's URL/events/active flag). */
export const useRealtimeWebhookId = () => useRealtimeConfig((s) => s.webhook?.id ?? null);

/** True once the backend is deployed to the user's Convex and realtime is switched on. */
export const useRealtimeConfigured = () =>
  useRealtimeConfig((s) => !!s.backend && !!s.deployKey && s.enabled);

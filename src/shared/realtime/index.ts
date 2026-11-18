/**
 * Realtime (webhook) plumbing shared by features.
 * The realtime feature drives the status and publishes events; other features
 * subscribe with `onRealtimeEvent` and slow their polling via `useIsRealtimeOnline`.
 */
import { create } from "zustand";

export type RealtimeState = "off" | "starting" | "online" | "error";

interface RealtimeStatus {
  state: RealtimeState;
  /** Public webhook URL while online. */
  url?: string;
  error?: string;
  lastEventAt?: string;
}

export const useRealtimeStatus = create<RealtimeStatus>(() => ({ state: "off" }));

export const setRealtimeStatus = (status: RealtimeStatus) =>
  useRealtimeStatus.setState(status, true);

/** True while webhooks are flowing — polling can back off. */
export const useIsRealtimeOnline = () => useRealtimeStatus((s) => s.state === "online");

/** A verified SocialAPI webhook delivery. */
export interface RealtimeEvent {
  /** e.g. "dm.received", "comment.received". */
  event: string;
  /** Envelope body: { event, data, raw_payload? }. */
  body: { event?: string; data?: unknown } & Record<string, unknown>;
}

type Handler = (e: RealtimeEvent) => void;
const handlers = new Set<Handler>();

export function onRealtimeEvent(handler: Handler): () => void {
  handlers.add(handler);
  return () => handlers.delete(handler);
}

export function publishRealtimeEvent(e: RealtimeEvent) {
  useRealtimeStatus.setState({ lastEventAt: new Date().toISOString() });
  for (const h of handlers) h(e);
}

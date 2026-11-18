/**
 * POST /inbox/sync — pulls fresh data from the platform. Needed for X / Bluesky / Zalo,
 * which don't push. Limited to 1 sync per target every 5 minutes (429 inbox.sync_rate_limited).
 */
import { api } from "@/shared/api";

import type { SyncStatus } from "../types";

const MIN_INTERVAL_MS = 5 * 60_000;
/** Last sync start per target, so we never hit the server-side rate limit. */
const lastSync = new Map<string, number>();

const targetKey = (accountId: string, conversationId?: string) =>
  `${accountId}:${conversationId ?? "*"}`;

export function startSync(accountId: string, conversationId?: string) {
  lastSync.set(targetKey(accountId, conversationId), Date.now());
  return api.post<{ data: SyncStatus }>("/inbox/sync", {
    account_id: accountId,
    ...(conversationId && { conversation_id: conversationId }),
  });
}

/** Starts a sync only if this target wasn't synced in the last 5 minutes. Errors are swallowed. */
export async function syncIfDue(accountId: string, conversationId?: string): Promise<boolean> {
  const last = lastSync.get(targetKey(accountId, conversationId)) ?? 0;
  if (Date.now() - last < MIN_INTERVAL_MS) return false;
  try {
    await startSync(accountId, conversationId);
    return true;
  } catch {
    return false;
  }
}

/** Live feed of webhook events stored on the user's Convex deployment (convex/events.ts). */
import { ConvexClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";

import type { RealtimeEvent } from "@/shared/realtime";

interface StoredEvent {
  id: string;
  at: number;
  event: string;
  body: RealtimeEvent["body"];
}

const cursorQuery = makeFunctionReference<"query", { token: string }, number>("events:cursor");
const sinceQuery = makeFunctionReference<"query", { token: string; after: number }, StoredEvent[]>(
  "events:since",
);

/**
 * Connects over WebSocket and calls `onEvent` for every event stored from now on, in order.
 * `onError` fires if the query fails (e.g. wrong read token or the backend is outdated);
 * dropped connections are retried by the Convex client itself.
 * Resolves to a function that closes the connection.
 */
export async function subscribeEvents(
  url: string,
  token: string,
  onEvent: (e: RealtimeEvent) => void,
  onError: (err: Error) => void,
): Promise<() => void> {
  const client = new ConvexClient(url, { unsavedChangesWarning: false });
  let closed = false;
  let unsubscribe = () => {};

  const listen = (after: number) => {
    unsubscribe = client.onUpdate(
      sinceQuery,
      { token, after },
      (rows) => {
        if (closed || rows.length === 0) return;
        for (const r of rows) onEvent({ event: r.event, body: r.body });
        // Move the cursor forward: the next subscription starts after the last one seen.
        const next = rows[rows.length - 1].at;
        queueMicrotask(() => {
          if (closed) return;
          unsubscribe();
          listen(next);
        });
      },
      (err) => {
        if (!closed) onError(err);
      },
    );
  };

  try {
    listen(await client.query(cursorQuery, { token }));
  } catch (err) {
    await client.close();
    throw err;
  }

  return () => {
    closed = true;
    unsubscribe();
    void client.close();
  };
}

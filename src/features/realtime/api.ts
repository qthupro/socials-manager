/** SocialAPI webhook endpoints (docs: guides/webhooks, api-reference/webhooks). */
import { api, type ListResponse } from "@/shared/api";

export interface Webhook {
  id: string;
  url: string;
  events: string[] | null;
  is_active: boolean;
  created_at: string;
}

/** Events this app reacts to. */
export const WEBHOOK_EVENTS = [
  "dm.received",
  "dm.sent",
  "dm.deleted",
  "dm.status.sent",
  "dm.status.delivered",
  "dm.status.read",
  "dm.status.failed",
  "comment.received",
  "mention.received",
  "review.received",
  "review.updated",
  "post.published",
  "post.partial",
  "post.failed",
];

const path = (id: string) => `/webhooks/${encodeURIComponent(id)}`;

export const webhooksApi = {
  list: async () => (await api.get<ListResponse<Webhook>>("/webhooks")).data,
  get: (id: string) => api.get<Webhook>(path(id)),
  /** The secret is only ever returned here. */
  create: (url: string) =>
    api.post<Webhook & { secret: string }>("/webhooks", { url, events: WEBHOOK_EVENTS }),
  update: (
    id: string,
    patch: Partial<Pick<Webhook, "url" | "is_active">> & { events?: string[] },
  ) => api.patch<Webhook>(path(id), patch),
  remove: (id: string) => api.delete(path(id)),
  /** Sends a signed test delivery (not retried). */
  test: (id: string) =>
    api.post<{
      status: "delivered" | "failed";
      response_status_code: number;
      response_duration_ms: number;
    }>(`${path(id)}/test`, {
      event_type: "test.ping",
      payload: { event: "test.ping", data: { sent_by: "social-manager" } },
    }),
};

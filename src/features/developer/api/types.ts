/**
 * SocialAPI developer schemas (docs: guides/webhooks, guides/authentication,
 * guides/scoped-keys, api-reference/{webhooks,events,api-keys}/*). Field names match the API.
 */

// ── Webhooks ────────────────────────────────────────────────────────────────

export interface WebhookEndpoint {
  id: string;
  url: string;
  events: string[] | null;
  is_active: boolean;
  created_at: string;
}

export interface DeliveryStatBucket {
  delivered: number;
  failed: number;
}

/** GET /webhooks/{id}: the endpoint plus a secret hint and delivery counts. */
export interface WebhookDetail extends WebhookEndpoint {
  /** "whsec_..." + the last 4 characters. The full secret is only returned on create. */
  secret_hint: string;
  stats: { last_24h: DeliveryStatBucket; last_7d: DeliveryStatBucket };
}

export interface CreatedWebhook {
  id: string;
  url: string;
  events: string[] | null;
  /** Shown once. */
  secret: string;
  message: string;
}

/** At least one field; `events` replaces the whole list. */
export interface UpdateWebhookParams {
  url?: string;
  events?: string[];
  is_active?: boolean;
}

export interface WebhookEventInfo {
  event: string;
  /** "posts" | "inbox" | "accounts" */
  category: string;
  description: string;
}

/** pending (not finished) · delivered (2xx) · failed (10 attempts used). */
export type DeliveryStatus = "pending" | "delivered" | "failed" | (string & {});

export interface DeliveryListItem {
  id: string;
  event_type: string;
  status: DeliveryStatus;
  response_status_code: number | null;
  response_duration_ms: number | null;
  attempt_count: number;
  /** "Instagram comment received", "Test delivery", "Retry of {id}", … */
  description: string;
  created_at: string;
}

export interface DeliveryPage {
  data: DeliveryListItem[] | null;
  /** Matching deliveries across all pages. */
  count: number;
  /** Absent on the last page. */
  next_cursor?: string;
}

export interface DeliveryAttempt {
  attempt_number: number;
  status_code: number | null;
  /** First 10,240 bytes of the endpoint's response. */
  response_body: string;
  duration_ms: number;
  /** Set when the attempt ended in a connection error / timeout. */
  error_message?: string;
  created_at: string;
}

export interface DeliveryDetail extends DeliveryListItem {
  endpoint_id: string;
  /** Exact body that was sent. */
  payload: Record<string, unknown> | null;
  attempts: DeliveryAttempt[] | null;
}

export interface TestDeliveryResult {
  delivery_id: string;
  status: "delivered" | "failed" | (string & {});
  /** 0 when the connection failed. */
  response_status_code: number;
  response_body: string;
  response_duration_ms: number;
}

// ── Event log ───────────────────────────────────────────────────────────────

export interface DevEvent {
  id: string;
  /** post | inbox | account | webhook | … */
  category: string;
  action: string;
  status: string;
  summary: string;
  created_at: string;
  platform?: string;
  account_id?: string;
  resource_id?: string;
  duration_ms?: number;
  status_code?: number;
  error_category?: string;
  error_message?: string;
  metadata: Record<string, unknown> | null;
}

export interface EventsPage {
  events: DevEvent[] | null;
  pagination: { has_more: boolean; limit: number; next_cursor?: string };
  /** Event history the plan keeps. */
  retention_days: number;
}

export interface EventsFilter {
  category?: string;
  /** ok | failed */
  status?: string;
  platform?: string;
  account_id?: string;
  resource_id?: string;
  action?: string;
  /** RFC3339 */
  from?: string;
  to?: string;
}

export interface EventsSummary {
  total: number;
  /** Same-length window before `from`. */
  total_previous?: number;
  failed: number;
  by_category: Record<string, number>;
  by_error_category: Record<string, number>;
  inbox_breakdown: Record<string, number>;
  retention_days: number;
}

// ── API keys ────────────────────────────────────────────────────────────────

export interface ApiKeyItem {
  id: string;
  name: string;
  /** "sapi_key_" + first 5 chars + "..." */
  preview: string;
  /** false once revoked — revoked keys stay in the list. */
  is_active: boolean;
  /** Absent when never used or rotated since. */
  last_used_at?: string;
  created_at: string;
  /** Empty = every scope. */
  scopes: string[] | null;
  /** Empty = every brand. */
  brand_ids: string[] | null;
}

export interface KeyScope {
  name: string;
  group: string;
  description: string;
}

/** POST /keys and POST /keys/{id}/rotate. */
export interface IssuedKey {
  id: string;
  name: string;
  /** Shown once. */
  raw_key: string;
  message: string;
  scopes: string[] | null;
  brand_ids: string[] | null;
}

/** PATCH replaces all three — an omitted array is saved as empty (unrestricted). */
export interface KeyParams {
  name: string;
  scopes: string[];
  brand_ids: string[];
}

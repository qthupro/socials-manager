import { httpFetch } from "@/shared/platform/http";

import { useApiKey } from "./api-key-store";

export const API_BASE_URL = "https://api.social-api.ai/v1";

/** Error envelope from SocialAPI: { error: { code, message, meta }, request_id }. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly meta?: Record<string, unknown>;
  readonly requestId?: string;
  /** Seconds from the Retry-After header, when present (429 / 503). */
  readonly retryAfter?: number;

  constructor(
    status: number,
    code: string,
    message: string,
    meta?: Record<string, unknown>,
    requestId?: string,
    retryAfter?: number,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.meta = meta;
    this.requestId = requestId;
    this.retryAfter = retryAfter;
  }
}

interface ErrorEnvelope {
  error?: { code?: string; message?: string; meta?: Record<string, unknown> };
  request_id?: string;
}

function requireKey(apiKey?: string) {
  const key = apiKey ?? useApiKey.getState().apiKey;
  if (!key) throw new ApiError(0, "client.no_api_key", "Chưa nhập API key.");
  return key;
}

async function send(url: string, init: RequestInit): Promise<Response> {
  try {
    return await httpFetch(url, init);
  } catch (err) {
    throw new ApiError(0, "client.network", `Không kết nối được tới SocialAPI (${String(err)}).`);
  }
}

async function toApiError(res: Response): Promise<ApiError> {
  let env: ErrorEnvelope = {};
  try {
    env = JSON.parse(await res.text()) as ErrorEnvelope;
  } catch {
    // Non-JSON error body.
  }
  const retryAfter = Number(res.headers.get("Retry-After")) || undefined;
  return new ApiError(
    res.status,
    env.error?.code ?? `http.${res.status}`,
    env.error?.message ?? `${res.status} ${res.statusText}`,
    env.error?.meta,
    env.request_id,
    retryAfter,
  );
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  apiKey?: string,
): Promise<T> {
  const key = requireKey(apiKey);
  const isForm = body instanceof FormData;

  const res = await send(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
      // FormData sets its own multipart Content-Type (with boundary).
      ...(body !== undefined && !isForm && { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
  });

  if (!res.ok) throw await toApiError(res);

  const text = await res.text();
  try {
    return (text ? JSON.parse(text) : undefined) as T;
  } catch {
    return undefined as T;
  }
}

/** GET an authenticated binary resource (e.g. /inbox/media/{id}) as a Blob. */
async function getBlob(url: string): Promise<Blob> {
  const res = await send(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${requireKey()}` },
  });
  if (!res.ok) throw await toApiError(res);
  return res.blob();
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body ?? {}),
  patch: <T>(path: string, body: unknown) => request<T>("PATCH", path, body),
  delete: <T = void>(path: string) => request<T>("DELETE", path),
  /** multipart/form-data POST (file uploads). */
  upload: <T>(path: string, form: FormData) => request<T>("POST", path, form),
  getBlob,
  /** GET with an explicit key — used to test a key before saving it. */
  getWithKey: <T>(path: string, apiKey: string) => request<T>("GET", path, undefined, apiKey),
};

export interface ListResponse<T> {
  data: T[];
  count: number;
}

/** Cursor-paginated list envelope (inbox, posts, …). */
export interface CursorPage<T> {
  data: T[] | null;
  pagination: { has_more: boolean; next_cursor: string };
}

/** Builds "?a=1&b=2", skipping empty values. */
export function toQuery(params: Record<string, string | number | undefined | null>) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

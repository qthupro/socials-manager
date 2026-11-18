/**
 * Deploys convex/ to the user's OWN Convex deployment using only their deploy key — the
 * same HTTP calls `npx convex deploy` makes, with the code pre-bundled at build time
 * (scripts/build-convex.mjs → push-request.json). Each user has a separate deployment;
 * nothing is shared between users.
 */
import { invoke, isTauri } from "@tauri-apps/api/core";
import { version as convexVersion } from "convex";

import { BACKEND_VERSION } from "./version";

const BIG_BRAIN = "https://api.convex.dev/api";
const SCHEMA_TIMEOUT_MS = 10_000;
const SCHEMA_MAX_WAIT_MS = 5 * 60_000;

export interface ConvexDeployment {
  name: string;
  /** https://<name>.convex.cloud — functions + WebSocket. */
  url: string;
  /** https://<name>.convex.site — HTTP actions (webhook receiver). */
  siteUrl: string;
}

/** `prod:<name>|<token>` → name (null when it isn't a deployment deploy key). */
export function deploymentNameFromKey(key: string) {
  const [prefix, token] = key.trim().split("|");
  if (!token) return null;
  const name = prefix.includes(":") ? prefix.slice(prefix.indexOf(":") + 1) : prefix;
  return /^[a-z0-9-]+$/.test(name) ? name : null;
}

export const isProdKey = (key: string) => key.trim().startsWith("prod:");

/** Bundled push request (lazy: ~400 KB, only needed when deploying). */
const loadPushRequest = async () =>
  (await import("./push-request.json")).default as Record<string, unknown>;

/**
 * POST JSON → parsed JSON (null for an empty body). In the app it goes through Rust
 * (commands/convex.rs) and gets the body in one piece — the http plugin's streamed
 * `fetch` body failed on these calls.
 */
async function convexPost<T>(url: string, authorization: string, body: unknown): Promise<T> {
  const client = `npm-cli-${convexVersion}`;
  const json = JSON.stringify(body);
  let status: number;
  let text: string;
  if (isTauri()) {
    ({ status, body: text } = await invoke<{ status: number; body: string }>("convex_post", {
      url,
      authorization,
      client,
      body: json,
    }));
  } else {
    const res = await window.fetch(url, {
      method: "POST",
      headers: {
        Authorization: authorization,
        "Content-Type": "application/json",
        "Convex-Client": client,
      },
      body: json,
    });
    status = res.status;
    text = await res.text();
  }

  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    if (status < 400) throw new Error(`Convex trả về dữ liệu không hợp lệ: ${text.slice(0, 200)}`);
  }
  if (status >= 400) {
    const err = data as { message?: string; code?: string } | null;
    throw new Error(`Convex: ${err?.message || err?.code || text || `HTTP ${status}`}`);
  }
  return data as T;
}

const bigBrain = <T>(path: string, key: string, body: unknown) =>
  convexPost<T>(`${BIG_BRAIN}/${path}`, `Bearer ${key.trim()}`, body);

/** Finds the deployment URL for a deploy key (works for every region). */
export async function resolveDeployment(key: string): Promise<ConvexDeployment> {
  const name = deploymentNameFromKey(key);
  if (!name) throw new Error("Deploy key không đúng dạng (prod:<tên>|<token>)");
  const url = (await bigBrain<string>("deployment/url_for_key", key, { deployKey: key.trim() }))
    .trim()
    .replace(/\/$/, "");
  return { name, url, siteUrl: url.replace(/\.convex\.cloud$/, ".convex.site") };
}

function deploymentPost(url: string, key: string) {
  return <T>(path: string, body: unknown) =>
    convexPost<T>(`${url}${path}`, `Convex ${key.trim()}`, body);
}

/** Sets (string) or removes (null) environment variables on the deployment. */
export async function setDeploymentEnv(
  deployment: Pick<ConvexDeployment, "url">,
  key: string,
  vars: Record<string, string | null>,
) {
  await deploymentPost(deployment.url, key)("/api/update_environment_variables", {
    changes: Object.entries(vars).map(([name, value]) => ({ name, value })),
  });
}

type SchemaStatus =
  | { type: "inProgress" }
  | { type: "complete" }
  | { type: "raceDetected" }
  | { type: "failed"; error: string };

/**
 * Stores READ_TOKEN, then start_push → wait_for_schema → finish_push.
 * `readToken` is kept when redeploying so a running subscription stays valid.
 */
export async function deployBackend(
  key: string,
  options: { readToken?: string; onStep?: (step: string) => void } = {},
) {
  const { onStep } = options;
  onStep?.("Đang kiểm tra deploy key…");
  const deployment = await resolveDeployment(key);
  const request = await loadPushRequest();
  const adminKey = key.trim();
  const post = deploymentPost(deployment.url, adminKey);

  const readToken = options.readToken || randomToken();
  await post("/api/update_environment_variables", {
    changes: [{ name: "READ_TOKEN", value: readToken }],
  });

  onStep?.("Đang tải code lên Convex…");
  const startPush = await post<{ schemaChange: unknown }>("/api/deploy2/start_push", {
    ...request,
    adminKey,
    dryRun: false,
  });

  onStep?.("Đang kiểm tra schema…");
  const started = Date.now();
  for (;;) {
    const status = await post<SchemaStatus>("/api/deploy2/wait_for_schema", {
      adminKey,
      schemaChange: startPush.schemaChange,
      timeoutMs: SCHEMA_TIMEOUT_MS,
      dryRun: false,
    });
    if (status.type === "complete") break;
    if (status.type === "failed") throw new Error(`Schema lỗi: ${status.error}`);
    if (status.type === "raceDetected") throw new Error("Có lần deploy khác chạy cùng lúc");
    if (Date.now() - started > SCHEMA_MAX_WAIT_MS) throw new Error("Chờ schema quá lâu");
  }

  onStep?.("Đang hoàn tất…");
  await post("/api/deploy2/finish_push", { adminKey, startPush, dryRun: false });

  return { deployment, readToken, version: BACKEND_VERSION };
}

function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

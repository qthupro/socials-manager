/**
 * SocialAPI webhook receiver: POST /hook/<installId>.
 * Checks X-SocialAPI-Signature-V2 (HMAC-SHA256 of "<timestamp>.<body>" with WEBHOOK_SECRET,
 * ±5 min), stores the event, answers 200. Until WEBHOOK_SECRET is set (right after the
 * webhook is created) requests are acknowledged and dropped.
 */
import { httpActionGeneric, httpRouter, makeFunctionReference } from "convex/server";

const MAX_BODY = 1024 * 1024;
const TOLERANCE_SECS = 300;

const record = makeFunctionReference<
  "mutation",
  { delivery?: string; event: string; body: unknown }
>("events:record");

function toHex(buf: ArrayBuffer) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function verify(secret: string, timestamp: string, signature: string, body: string) {
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > TOLERANCE_SECS) return false;
  if (!signature.startsWith("sha256=")) return false;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, enc.encode(`${timestamp}.${body}`));
  return safeEqual(toHex(mac), signature.slice("sha256=".length).toLowerCase());
}

const http = httpRouter();

http.route({
  pathPrefix: "/hook/",
  method: "POST",
  handler: httpActionGeneric(async (ctx, req) => {
    const body = await req.text();
    if (body.length > MAX_BODY) return new Response(null, { status: 413 });

    const secret = process.env.WEBHOOK_SECRET;
    // Not registered yet (e.g. SocialAPI's reachability check): acknowledge, ignore.
    if (!secret) return new Response(null, { status: 200 });

    const timestamp = req.headers.get("X-SocialAPI-Timestamp") ?? "";
    const signature = req.headers.get("X-SocialAPI-Signature-V2") ?? "";
    if (!(await verify(secret, timestamp, signature, body))) {
      return new Response(null, { status: 401 });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(body);
    } catch {
      return new Response(null, { status: 200 });
    }
    await ctx.runMutation(record, {
      delivery: req.headers.get("X-SocialAPI-Delivery") ?? undefined,
      event: req.headers.get("X-SocialAPI-Event") ?? "",
      body: parsed,
    });
    return new Response("ok", { status: 200, headers: { "Content-Type": "text/plain" } });
  }),
});

export default http;

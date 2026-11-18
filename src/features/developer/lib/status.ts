export type Tone = "ok" | "warn" | "fail" | "muted";

/** Tone of an HTTP status from a webhook endpoint (0 / null = no response). */
export function httpTone(code: number | null | undefined): Tone {
  if (!code) return "fail";
  if (code >= 200 && code < 300) return "ok";
  if (code >= 400) return "fail";
  return "warn";
}

export const DELIVERY_STATUS: Record<string, { label: string; tone: Tone }> = {
  delivered: { label: "Đã gửi", tone: "ok" },
  pending: { label: "Đang gửi", tone: "warn" },
  failed: { label: "Thất bại", tone: "fail" },
};

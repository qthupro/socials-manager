import { DELIVERY_STATUS } from "../lib/status";
import { StatusPill } from "./status-pill";

export function DeliveryStatusPill({ status }: { status: string }) {
  const s = DELIVERY_STATUS[status] ?? { label: status, tone: "muted" as const };
  return <StatusPill tone={s.tone}>{s.label}</StatusPill>;
}

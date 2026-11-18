import { Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { getErrorMessage } from "@/shared/api";
import { CopyButton } from "@/shared/components/copy-button";
import { ErrorState } from "@/shared/components/state-views";
import { Button } from "@/shared/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";
import { Skeleton } from "@/shared/components/ui/skeleton";

import { useDelivery, useRetryDelivery } from "../api/webhooks";
import { dateTimeSec, formatMs, prettyJson } from "../lib/format";
import { DeliveryStatusPill } from "./delivery-status";
import { httpTone } from "../lib/status";
import { StatusPill } from "./status-pill";

/** One delivery: the exact payload sent, every attempt, and a manual retry. */
export function DeliverySheet({
  webhookId,
  deliveryId,
  onOpenChange,
  onRetried,
}: {
  webhookId: string;
  deliveryId: string | null;
  onOpenChange: (open: boolean) => void;
  onRetried: (newDeliveryId: string) => void;
}) {
  const detail = useDelivery(webhookId, deliveryId ?? undefined);
  const retry = useRetryDelivery();
  const d = detail.data;

  const doRetry = async () => {
    if (!deliveryId) return;
    try {
      const res = await retry.mutateAsync({ id: webhookId, deliveryId });
      toast.success("Đã xếp hàng gửi lại (lượt gửi mới)");
      onRetried(res.id);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <Sheet open={!!deliveryId} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 sm:max-w-xl">
        <SheetHeader className="border-b">
          <SheetTitle className="font-mono text-sm">{d?.event_type ?? "Lượt gửi"}</SheetTitle>
          <SheetDescription>{d?.description ?? " "}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto p-4">
          {detail.error ? (
            <ErrorState error={detail.error} onRetry={() => detail.refetch()} />
          ) : !d ? (
            <Skeleton className="h-64 rounded-lg" />
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <DeliveryStatusPill status={d.status} />
                {d.response_status_code != null && (
                  <StatusPill tone={httpTone(d.response_status_code)}>
                    HTTP {d.response_status_code || "—"}
                  </StatusPill>
                )}
                <span className="text-xs text-muted-foreground">
                  {d.attempt_count}/10 lần thử · {formatMs(d.response_duration_ms)}
                </span>
                {d.status === "failed" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="ml-auto h-7"
                    disabled={retry.isPending}
                    onClick={doRetry}
                  >
                    {retry.isPending ? <Loader2 className="animate-spin" /> : <RotateCcw />} Gửi lại
                  </Button>
                )}
              </div>

              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
                <dt className="text-muted-foreground">Delivery ID</dt>
                <dd className="flex items-center gap-1 font-mono break-all">
                  {d.id}
                  <CopyButton value={d.id} />
                </dd>
                <dt className="text-muted-foreground">Tạo lúc</dt>
                <dd className="tabular-nums">{dateTimeSec.format(new Date(d.created_at))}</dd>
              </dl>

              <section className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">Payload đã gửi</h3>
                  <CopyButton value={prettyJson(d.payload)} />
                </div>
                <pre className="max-h-72 overflow-auto rounded-lg border bg-muted/40 p-3 font-mono text-xs">
                  {prettyJson(d.payload)}
                </pre>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-medium">Các lần thử</h3>
                {(d.attempts ?? []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">Chưa có lần thử nào.</p>
                ) : (
                  <ol className="space-y-2">
                    {(d.attempts ?? []).map((a) => (
                      <li key={a.attempt_number} className="space-y-1.5 rounded-lg border p-3">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-medium">#{a.attempt_number}</span>
                          <StatusPill tone={httpTone(a.status_code)}>
                            {a.status_code ? `HTTP ${a.status_code}` : "Lỗi kết nối"}
                          </StatusPill>
                          <span className="text-muted-foreground">{formatMs(a.duration_ms)}</span>
                          <span className="ml-auto text-muted-foreground tabular-nums">
                            {dateTimeSec.format(new Date(a.created_at))}
                          </span>
                        </div>
                        {a.error_message && (
                          <p className="text-xs text-destructive">{a.error_message}</p>
                        )}
                        {a.response_body && (
                          <pre className="max-h-32 overflow-auto rounded-md bg-muted/40 p-2 font-mono text-xs whitespace-pre-wrap">
                            {a.response_body}
                          </pre>
                        )}
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

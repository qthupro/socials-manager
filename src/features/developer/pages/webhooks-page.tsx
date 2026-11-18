import { CircleCheck, CircleX, Loader2, Lock, Pencil, Plus, Trash2, Webhook } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useRealtimeWebhookId } from "@/features/realtime";
import { getErrorMessage } from "@/shared/api";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { CopyButton } from "@/shared/components/copy-button";
import { PageHeader } from "@/shared/components/page-header";
import { EmptyState, ErrorState, RequireApiKey } from "@/shared/components/state-views";
import { Button } from "@/shared/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Switch } from "@/shared/components/ui/switch";
import { cn } from "@/shared/lib/utils";

import type { WebhookEndpoint } from "../api/types";
import {
  useDeleteWebhook,
  useDeliveries,
  useUpdateWebhook,
  useWebhook,
  useWebhooks,
} from "../api/webhooks";
import { DeliverySheet } from "../components/delivery-sheet";
import { DeliveryStatusPill } from "../components/delivery-status";
import { StatusPill } from "../components/status-pill";
import { WebhookFormDialog } from "../components/webhook-form-dialog";
import { WebhookTestDialog } from "../components/webhook-test-dialog";
import { dateTime, formatMs, number, timeAgo } from "../lib/format";
import { DELIVERY_STATUS, httpTone } from "../lib/status";

const ALL = "all";

const hostOf = (url: string) => {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
};

function ManagedBadge() {
  return (
    <StatusPill tone="muted" className="gap-1">
      <Lock className="size-3" /> Realtime của app
    </StatusPill>
  );
}

function EndpointItem({
  webhook,
  selected,
  managed,
  onSelect,
}: {
  webhook: WebhookEndpoint;
  selected: boolean;
  managed: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full rounded-xl border bg-card p-3 text-left transition-colors hover:border-primary/50",
        selected && "border-primary ring-1 ring-primary/30",
      )}
    >
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "size-2 shrink-0 rounded-full",
            webhook.is_active ? "bg-green-500" : "bg-muted-foreground/40",
          )}
        />
        <p className="truncate text-sm font-medium">{hostOf(webhook.url)}</p>
      </div>
      <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">{webhook.url}</p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        <span>{webhook.events?.length ?? 0} sự kiện</span>
        <span>·</span>
        <span>{webhook.is_active ? "Đang bật" : "Đã tắt"}</span>
        {managed && <ManagedBadge />}
      </div>
    </button>
  );
}

function StatCard({ label, ok, fail }: { label: string; ok: number; fail: number }) {
  const total = ok + fail;
  const rate = total ? Math.round((ok / total) * 100) : null;
  return (
    <div className="rounded-xl border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-1 flex items-baseline gap-3">
        <span className="flex items-center gap-1 text-lg font-semibold tabular-nums">
          <CircleCheck className="size-4 text-green-600" /> {number.format(ok)}
        </span>
        <span
          className={cn(
            "flex items-center gap-1 text-lg font-semibold tabular-nums",
            fail > 0 ? "text-destructive" : "text-muted-foreground",
          )}
        >
          <CircleX className="size-4" /> {number.format(fail)}
        </span>
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {rate == null ? "Chưa có lượt gửi" : `${rate}% thành công`}
      </p>
    </div>
  );
}

function DeliveriesSection({ webhookId, events }: { webhookId: string; events: string[] }) {
  const [status, setStatus] = useState(ALL);
  const [eventType, setEventType] = useState(ALL);
  const [openId, setOpenId] = useState<string | null>(null);
  const q = useDeliveries(
    webhookId,
    status === ALL ? undefined : status,
    eventType === ALL ? undefined : eventType,
  );

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="mr-auto text-sm font-medium">
          Lượt gửi{" "}
          {q.data && (
            <span className="font-normal text-muted-foreground">({number.format(q.total)})</span>
          )}
        </h3>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger size="sm" className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Mọi trạng thái</SelectItem>
            {Object.entries(DELIVERY_STATUS).map(([k, s]) => (
              <SelectItem key={k} value={k}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={eventType} onValueChange={setEventType}>
          <SelectTrigger size="sm" className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Mọi sự kiện</SelectItem>
            {events.map((e) => (
              <SelectItem key={e} value={e} className="font-mono text-xs">
                {e}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {q.error ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : q.isLoading ? (
        <Skeleton className="h-48 rounded-xl" />
      ) : q.deliveries.length === 0 ? (
        <EmptyState
          icon={Webhook}
          title="Chưa có lượt gửi"
          description="Lượt gửi xuất hiện khi có sự kiện đã đăng ký, hoặc khi bạn “Gửi thử”."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Sự kiện</th>
                <th className="px-3 py-2 text-left font-medium">Trạng thái</th>
                <th className="px-3 py-2 text-left font-medium">Phản hồi</th>
                <th className="px-3 py-2 text-left font-medium">Lần thử</th>
                <th className="px-3 py-2 text-right font-medium">Thời điểm</th>
              </tr>
            </thead>
            <tbody>
              {q.deliveries.map((d) => (
                <tr
                  key={d.id}
                  className="cursor-pointer border-t hover:bg-muted/40"
                  onClick={() => setOpenId(d.id)}
                >
                  <td className="px-3 py-2">
                    <p className="font-mono text-xs">{d.event_type}</p>
                    <p className="max-w-64 truncate text-xs text-muted-foreground">
                      {d.description}
                    </p>
                  </td>
                  <td className="px-3 py-2">
                    <DeliveryStatusPill status={d.status} />
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {d.response_status_code != null ? (
                      <span className="flex items-center gap-1.5">
                        <StatusPill tone={httpTone(d.response_status_code)}>
                          {d.response_status_code || "—"}
                        </StatusPill>
                        <span className="text-muted-foreground">
                          {formatMs(d.response_duration_ms)}
                        </span>
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs tabular-nums">{d.attempt_count}/10</td>
                  <td
                    className="px-3 py-2 text-right text-xs text-muted-foreground tabular-nums"
                    title={dateTime.format(new Date(d.created_at))}
                  >
                    {timeAgo(d.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {q.hasNextPage && (
            <div className="border-t p-2 text-center">
              <Button
                variant="ghost"
                size="sm"
                disabled={q.isFetchingNextPage}
                onClick={() => q.fetchNextPage()}
              >
                {q.isFetchingNextPage && <Loader2 className="animate-spin" />} Tải thêm
              </Button>
            </div>
          )}
        </div>
      )}

      <DeliverySheet
        webhookId={webhookId}
        deliveryId={openId}
        onOpenChange={(o) => !o && setOpenId(null)}
        onRetried={setOpenId}
      />
    </section>
  );
}

function EndpointDetail({
  webhook,
  managed,
  onDeleted,
}: {
  webhook: WebhookEndpoint;
  managed: boolean;
  onDeleted: () => void;
}) {
  const detail = useWebhook(webhook.id);
  const update = useUpdateWebhook();
  const remove = useDeleteWebhook();
  const d = detail.data;
  const events = webhook.events ?? [];

  const toggleActive = async (on: boolean) => {
    try {
      await update.mutateAsync({ id: webhook.id, patch: { is_active: on } });
      toast.success(on ? "Đã bật endpoint" : "Đã tắt endpoint — sự kiện trong lúc tắt sẽ không được gửi bù");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="min-w-0 space-y-5">
      <div className="space-y-3 rounded-xl border bg-card p-4">
        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-1">
              <p className="truncate font-mono text-sm font-medium">{webhook.url}</p>
              <CopyButton value={webhook.url} />
            </div>
            <p className="text-xs text-muted-foreground">
              Tạo {dateTime.format(new Date(webhook.created_at))}
              {d?.secret_hint && (
                <>
                  {" "}
                  · Secret <code className="font-mono">{d.secret_hint}</code>
                </>
              )}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <WebhookTestDialog webhookId={webhook.id} />
            {!managed && (
              <>
                <WebhookFormDialog
                  webhook={webhook}
                  trigger={
                    <Button variant="outline" size="sm">
                      <Pencil /> Sửa
                    </Button>
                  }
                />
                <ConfirmDialog
                  trigger={
                    <Button variant="ghost" size="icon-sm" aria-label="Xoá" className="text-destructive">
                      <Trash2 />
                    </Button>
                  }
                  title="Xoá webhook endpoint?"
                  description="SocialAPI ngừng gửi sự kiện tới URL này. Lượt gửi đang chạy có thể vẫn tới một lần."
                  confirmLabel="Xoá endpoint"
                  onConfirm={async () => {
                    await remove.mutateAsync(webhook.id);
                    toast.success("Đã xoá endpoint");
                    onDeleted();
                  }}
                />
              </>
            )}
          </div>
        </div>

        {managed ? (
          <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
            <Lock className="mt-0.5 size-3.5 shrink-0" />
            <p>
              Endpoint này do chế độ Realtime của ứng dụng quản lý (Cài đặt › Realtime). App tự đồng
              bộ URL, sự kiện và trạng thái nên không sửa / xoá ở đây — bạn vẫn xem lượt gửi và gửi
              thử được.
            </p>
          </div>
        ) : (
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={webhook.is_active}
              disabled={update.isPending}
              onCheckedChange={toggleActive}
            />
            {webhook.is_active ? "Đang nhận sự kiện" : "Đã tắt — không gửi, không gửi bù"}
          </label>
        )}

        <div className="flex flex-wrap gap-1">
          {events.map((e) => (
            <code key={e} className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs">
              {e}
            </code>
          ))}
        </div>
      </div>

      {detail.error ? (
        <ErrorState error={detail.error} onRetry={() => detail.refetch()} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {d ? (
            <>
              <StatCard label="24 giờ qua" ok={d.stats.last_24h.delivered} fail={d.stats.last_24h.failed} />
              <StatCard label="7 ngày qua" ok={d.stats.last_7d.delivered} fail={d.stats.last_7d.failed} />
            </>
          ) : (
            <>
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
            </>
          )}
        </div>
      )}

      <DeliveriesSection key={webhook.id} webhookId={webhook.id} events={events} />
    </div>
  );
}

function WebhooksContent() {
  const webhooks = useWebhooks();
  const managedId = useRealtimeWebhookId();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const list = webhooks.data ?? [];
  const selected = list.find((w) => w.id === selectedId) ?? list[0];

  const addButton = (
    <WebhookFormDialog
      onCreated={setSelectedId}
      trigger={
        <Button size="sm">
          <Plus /> Thêm endpoint
        </Button>
      }
    />
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Webhooks"
        description="Nhận sự kiện bài đăng, hộp thư và tài khoản qua HTTPS, có chữ ký HMAC."
        actions={addButton}
      />

      {webhooks.error ? (
        <ErrorState error={webhooks.error} onRetry={() => webhooks.refetch()} />
      ) : webhooks.isLoading ? (
        <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      ) : list.length === 0 ? (
        <EmptyState
          icon={Webhook}
          title="Chưa có webhook endpoint"
          description="Thêm một URL HTTPS để SocialAPI đẩy sự kiện (bình luận, tin nhắn, bài đăng…) ngay khi chúng xảy ra thay vì phải hỏi liên tục."
          action={addButton}
        />
      ) : (
        <div className="grid items-start gap-5 lg:grid-cols-[300px_1fr]">
          <div className="space-y-2">
            {list.map((w) => (
              <EndpointItem
                key={w.id}
                webhook={w}
                selected={w.id === selected?.id}
                managed={w.id === managedId}
                onSelect={() => setSelectedId(w.id)}
              />
            ))}
          </div>
          {selected && (
            <EndpointDetail
              key={selected.id}
              webhook={selected}
              managed={selected.id === managedId}
              onDeleted={() => setSelectedId(null)}
            />
          )}
        </div>
      )}
    </div>
  );
}

/**
 * SocialAPI endpoints for this screen:
 *   GET|POST /webhooks
 *   GET /webhooks/events
 *   GET|PATCH|DELETE /webhooks/{id}
 *   POST /webhooks/{id}/test
 *   GET /webhooks/{id}/deliveries, GET /webhooks/{id}/deliveries/{delivery_id}
 *   POST /webhooks/{id}/deliveries/{delivery_id}/retry
 */
export function WebhooksPage() {
  return (
    <RequireApiKey>
      <WebhooksContent />
    </RequireApiKey>
  );
}

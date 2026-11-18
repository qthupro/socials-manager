import { Clock, EllipsisVertical, ListOrdered, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { useBrands, type Brand } from "@/features/connections";
import { getErrorMessage } from "@/shared/api";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { PageHeader } from "@/shared/components/page-header";
import { EmptyState, ErrorState, RequireApiKey } from "@/shared/components/state-views";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
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

import {
  MAX_QUEUES_PER_BRAND,
  useDeleteQueue,
  useQueuePreview,
  useQueues,
  useUpdateQueue,
  WEEKDAYS,
  type Queue,
} from "../api/queues";
import { QueueFormDialog } from "../components/queues/queue-form-dialog";
import { WEEKDAY_LABEL } from "../lib/weekdays";

const ALL = "all";
const PREVIEW_COUNT = 5;

/** "2026-10-20T19:00:00+02:00" → "T3 20/10 19:00" (as written, in the Queue's timezone). */
function formatQueuedTime(day: keyof typeof WEEKDAY_LABEL, iso: string) {
  const [date, rest] = iso.split("T");
  const [, m, d] = date.split("-");
  return `${WEEKDAY_LABEL[day].short} ${d}/${m} ${rest.slice(0, 5)}`;
}

function UpcomingTimes({ queue }: { queue: Queue }) {
  const preview = useQueuePreview(queue.id, PREVIEW_COUNT);
  if (preview.isLoading) return <Skeleton className="h-5 w-2/3" />;
  if (preview.error)
    return <p className="text-xs text-destructive">{getErrorMessage(preview.error)}</p>;
  const times = preview.data ?? [];
  if (times.length === 0) {
    return <p className="text-xs text-muted-foreground">Không còn khung giờ trống.</p>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {times.map((t) => (
        <span
          key={t.time}
          className="rounded-md border px-1.5 py-0.5 text-xs text-muted-foreground tabular-nums"
        >
          {formatQueuedTime(t.day, t.time)}
        </span>
      ))}
    </div>
  );
}

function QueueCard({ queue: q, brands }: { queue: Queue; brands: Brand[] }) {
  const update = useUpdateQueue();
  const remove = useDeleteQueue();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const slots = q.slots ?? [];

  const toggleActive = async (active: boolean) => {
    try {
      await update.mutateAsync({ id: q.id, body: { active } });
      toast.success(active ? "Đã mở lại hàng đợi" : "Đã tạm dừng hàng đợi");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const makeDefault = async () => {
    try {
      await update.mutateAsync({ id: q.id, body: { is_default: true } });
      toast.success(`“${q.name}” là hàng đợi mặc định`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className={cn("space-y-4 rounded-xl border bg-card p-4", !q.active && "opacity-75")}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-semibold">{q.name}</p>
            {q.is_default && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                <Star className="size-3" /> Mặc định
              </span>
            )}
            {!q.active && (
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-700 dark:text-amber-300">
                Tạm dừng
              </span>
            )}
          </div>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="size-3" /> {q.timezone} · {slots.length} khung giờ / tuần
          </p>
        </div>
        <Switch
          checked={q.active}
          disabled={update.isPending}
          onCheckedChange={toggleActive}
          title={q.active ? "Tạm dừng" : "Mở lại"}
        />
        <QueueFormDialog
          queue={q}
          brands={brands}
          trigger={
            <Button variant="ghost" size="icon-sm" title="Sửa">
              <Pencil />
            </Button>
          }
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Thao tác">
              <EllipsisVertical />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {!q.is_default && (
              <>
                <DropdownMenuItem onSelect={makeDefault}>
                  <Star /> Đặt làm mặc định
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem variant="destructive" onSelect={() => setConfirmDelete(true)}>
              <Trash2 /> Xoá
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Week at a glance. */}
      <div className="grid grid-cols-7 gap-1.5">
        {WEEKDAYS.map((day) => {
          const times = slots.filter((s) => s.day === day);
          return (
            <div key={day} className="min-w-0 space-y-1">
              <p className="text-center text-[11px] font-medium text-muted-foreground">
                {WEEKDAY_LABEL[day].short}
              </p>
              <div className="space-y-1">
                {times.length === 0 ? (
                  <p className="text-center text-xs text-muted-foreground/50">—</p>
                ) : (
                  times.map((s) => (
                    <p
                      key={s.time}
                      className="rounded bg-primary/10 py-0.5 text-center text-xs text-primary tabular-nums"
                    >
                      {s.time}
                    </p>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="space-y-1.5 border-t pt-3">
        <p className="text-xs font-medium">Khung giờ trống sắp tới</p>
        <UpcomingTimes queue={q} />
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Xoá hàng đợi “${q.name}”?`}
        description={
          <>
            Các bài đang trong hàng đợi vẫn giữ giờ đăng, chỉ không còn thuộc hàng đợi nữa.
            {q.is_default && " Hàng đợi cũ nhất còn lại sẽ thành mặc định."}
          </>
        }
        confirmLabel="Xoá"
        onConfirm={async () => {
          const res = await remove.mutateAsync(q.id);
          toast.success(
            res.released_count
              ? `Đã xoá, ${res.released_count} bài giữ nguyên giờ đăng`
              : "Đã xoá hàng đợi",
          );
        }}
      />
    </div>
  );
}

function QueuesContent() {
  const brands = useBrands();
  const [brandId, setBrandId] = useState(ALL);
  const queues = useQueues(brandId === ALL ? undefined : brandId);
  const brandList = useMemo(() => brands.data ?? [], [brands.data]);

  // Grouped by brand (the API returns them grouped, oldest first).
  const groups = useMemo(() => {
    const map = new Map<string, Queue[]>();
    for (const q of queues.data ?? []) map.set(q.brand_id, [...(map.get(q.brand_id) ?? []), q]);
    return [...map.entries()].map(([id, list]) => ({
      brand: brandList.find((b) => b.id === id),
      id,
      list,
    }));
  }, [queues.data, brandList]);

  const error = queues.error ?? brands.error;
  const loading = queues.isLoading || brands.isLoading;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hàng đợi"
        description="Khung giờ đăng cố định hằng tuần cho từng thương hiệu. Khi soạn bài, chọn “Thêm vào hàng đợi” để bài tự lấy giờ trống sớm nhất."
        actions={
          brandList.length > 0 && (
            <QueueFormDialog
              brands={brandList}
              defaultBrandId={brandId === ALL ? undefined : brandId}
              trigger={
                <Button size="sm">
                  <Plus /> Tạo hàng đợi
                </Button>
              }
            />
          )
        }
      />

      {brandList.length > 1 && (
        <Select value={brandId} onValueChange={setBrandId}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tất cả thương hiệu</SelectItem>
            {brandList.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {error ? (
        <ErrorState
          error={error}
          onRetry={() => {
            queues.refetch();
            brands.refetch();
          }}
        />
      ) : loading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 2 }, (_, i) => (
            <Skeleton key={i} className="h-56 rounded-xl" />
          ))}
        </div>
      ) : brandList.length === 0 ? (
        <EmptyState
          icon={ListOrdered}
          title="Chưa có thương hiệu nào"
          description="Hàng đợi thuộc về một thương hiệu — tạo thương hiệu trong mục Thương hiệu trước."
        />
      ) : groups.length === 0 ? (
        <EmptyState
          icon={ListOrdered}
          title="Chưa có hàng đợi nào"
          description="Đặt sẵn các khung giờ đăng trong tuần (VD 9:00 và 19:00 mỗi ngày), rồi chỉ cần thêm bài vào hàng đợi."
          action={
            <QueueFormDialog
              brands={brandList}
              defaultBrandId={brandId === ALL ? undefined : brandId}
              trigger={
                <Button size="sm">
                  <Plus /> Tạo hàng đợi
                </Button>
              }
            />
          }
        />
      ) : (
        groups.map((g) => (
          <section key={g.id} className="space-y-3">
            <h3 className="text-sm font-semibold">
              {g.brand?.name ?? g.id}
              <span className="ml-2 font-normal text-muted-foreground">
                {g.list.length}/{MAX_QUEUES_PER_BRAND}
              </span>
            </h3>
            <div className="grid gap-4 lg:grid-cols-2">
              {g.list.map((q) => (
                <QueueCard key={q.id} queue={q} brands={brandList} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

/**
 * SocialAPI endpoints for this screen:
 *   GET|POST /queues, PATCH|DELETE /queues/{id}, GET /queues/{id}/preview
 */
export function QueuesPage() {
  return (
    <RequireApiKey>
      <QueuesContent />
    </RequireApiKey>
  );
}

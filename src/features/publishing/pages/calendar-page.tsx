import { ChevronLeft, ChevronRight, Loader2, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";

import { useAccounts, useBrands } from "@/features/connections";
import { PageHeader } from "@/shared/components/page-header";
import { PlatformIcon } from "@/shared/components/platform-icon";
import { ErrorState, RequireApiKey } from "@/shared/components/state-views";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { cn } from "@/shared/lib/utils";

import { usePostsInRange } from "../api/posts";
import type { Post } from "../api/types";
import { PostDetailSheet } from "../components/post-detail-sheet";
import { formatInfo, formatOfPost } from "../lib/formats";
import { POST_STATUS } from "../lib/status";
import { useTargetOptions } from "../lib/targets";

const ALL = "all";
const WEEK_HEADER = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const MAX_PER_DAY = 3;

/** Dot colour per post status. */
const STATUS_DOT: Record<Post["status"], string> = {
  draft: "bg-muted-foreground",
  scheduled: "bg-blue-500",
  publishing: "bg-amber-500",
  published: "bg-green-500",
  partial: "bg-orange-500",
  failed: "bg-destructive",
  cancelled: "bg-muted-foreground",
};

const pad = (n: number) => String(n).padStart(2, "0");
const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Same rule as GET /posts from/to: publish time, else scheduled time, else creation time. */
const calendarTime = (p: Post) => p.published_at ?? p.scheduled_at ?? p.created_at;

/** 6 weeks, Monday first, covering the month. */
function monthGrid(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7; // Monday = 0
  const start = new Date(first);
  start.setDate(first.getDate() - offset);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

/** datetime-local value for a new post on that day: 09:00, or an hour from now if that's past. */
function scheduleTimeOn(d: Date) {
  const at = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 9, 0);
  const min = new Date(Date.now() + 60 * 60_000);
  const when = at > min ? at : min;
  return `${dayKey(when)}T${pad(when.getHours())}:${pad(when.getMinutes())}`;
}

const monthTitle = new Intl.DateTimeFormat("vi-VN", { month: "long", year: "numeric" });
const timeFmt = new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" });

function PostChip({ post: p, onOpen }: { post: Post; onOpen: () => void }) {
  const format = formatOfPost(p);
  const platforms = [...new Set((p.targets ?? []).map((t) => t.platform))];
  return (
    <button
      type="button"
      onClick={onOpen}
      title={`${POST_STATUS[p.status].label}${p.text ? ` · ${p.text.slice(0, 80)}` : ""}`}
      className="flex w-full items-center gap-1 rounded px-1 py-0.5 text-left text-[11px] hover:bg-muted"
    >
      <span className={cn("size-1.5 shrink-0 rounded-full", STATUS_DOT[p.status])} />
      <span className="shrink-0 text-muted-foreground tabular-nums">
        {timeFmt.format(new Date(calendarTime(p)))}
      </span>
      <span className="flex shrink-0 -space-x-1">
        {platforms.slice(0, 3).map((pl) => (
          <PlatformIcon
            key={pl}
            platform={pl}
            size="sm"
            className="size-3.5 rounded-sm [&_svg]:size-2"
          />
        ))}
      </span>
      <span className="min-w-0 truncate">
        {format !== "post" && <span className="font-medium">{formatInfo(format).label} · </span>}
        {p.text || p.title || "(chưa có nội dung)"}
      </span>
    </button>
  );
}

function CalendarContent() {
  const navigate = useNavigate();
  const accounts = useAccounts();
  const brands = useBrands();
  const { optionOf } = useTargetOptions(accounts.data ?? []);
  const [month, setMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [brandId, setBrandId] = useState(ALL);
  const [showDrafts, setShowDrafts] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const days = useMemo(() => monthGrid(month), [month]);
  const range = useMemo(() => {
    const end = new Date(days[41]);
    end.setHours(23, 59, 59, 999);
    return { from: startOfDay(days[0]).toISOString(), to: end.toISOString() };
  }, [days]);

  const posts = usePostsInRange({ ...range, brand_id: brandId === ALL ? undefined : brandId });

  const byDay = useMemo(() => {
    const map = new Map<string, Post[]>();
    for (const p of posts.data ?? []) {
      if (!showDrafts && p.status === "draft") continue;
      const key = dayKey(new Date(calendarTime(p)));
      map.set(key, [...(map.get(key) ?? []), p]);
    }
    for (const list of map.values())
      list.sort((a, b) => calendarTime(a).localeCompare(calendarTime(b)));
    return map;
  }, [posts.data, showDrafts]);

  const open = posts.data?.find((p) => p.id === openId);
  const today = dayKey(new Date());
  const shift = (by: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + by, 1));

  /** New post scheduled on that day (09:00 local, or one hour from now if that's past). */
  const createOn = (d: Date) =>
    navigate("/posts/new", { state: { scheduledAt: scheduleTimeOn(d) } });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Lịch đăng"
        description="Bài đã đăng, đã lên lịch và đang chờ theo từng ngày."
        actions={
          <Button size="sm" onClick={() => navigate("/posts/new")}>
            <Plus /> Tạo bài viết
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Tháng trước"
            onClick={() => shift(-1)}
          >
            <ChevronLeft />
          </Button>
          <Button variant="outline" size="icon-sm" aria-label="Tháng sau" onClick={() => shift(1)}>
            <ChevronRight />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}
          >
            Hôm nay
          </Button>
        </div>
        <h3 className="text-base font-semibold capitalize">{monthTitle.format(month)}</h3>
        {posts.isFetching && <Loader2 className="size-4 animate-spin text-muted-foreground" />}

        <div className="ml-auto flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={showDrafts} onCheckedChange={(v) => setShowDrafts(!!v)} />
            Hiện bài nháp
          </label>
          {(brands.data?.length ?? 0) > 1 && (
            <Select value={brandId} onValueChange={setBrandId}>
              <SelectTrigger className="w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tất cả thương hiệu</SelectItem>
                {brands.data?.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {(["scheduled", "publishing", "published", "partial", "failed"] as const).map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5">
            <span className={cn("size-2 rounded-full", STATUS_DOT[s])} /> {POST_STATUS[s].label}
          </span>
        ))}
      </div>

      {posts.error ? (
        <ErrorState error={posts.error} onRetry={() => posts.refetch()} />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="grid grid-cols-7 border-b bg-muted/50">
            {WEEK_HEADER.map((d) => (
              <div
                key={d}
                className="px-2 py-2 text-center text-xs font-medium text-muted-foreground"
              >
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((d, i) => {
              const key = dayKey(d);
              const list = byDay.get(key) ?? [];
              const inMonth = d.getMonth() === month.getMonth();
              const isPast = key < today;
              const showAll = expanded === key;
              const shown = showAll ? list : list.slice(0, MAX_PER_DAY);
              return (
                <div
                  key={key}
                  className={cn(
                    "group min-h-28 space-y-0.5 border-b p-1.5",
                    (i + 1) % 7 !== 0 && "border-r",
                    i >= 35 && "border-b-0",
                    !inMonth && "bg-muted/30",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "flex size-6 items-center justify-center rounded-full text-xs",
                        !inMonth && "text-muted-foreground/60",
                        key === today && "bg-primary font-semibold text-primary-foreground",
                      )}
                    >
                      {d.getDate()}
                    </span>
                    {!isPast && (
                      <button
                        type="button"
                        title="Lên lịch bài vào ngày này"
                        onClick={() => createOn(d)}
                        className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-muted hover:text-foreground"
                      >
                        <Plus className="size-3.5" />
                      </button>
                    )}
                  </div>
                  {posts.isLoading && inMonth && i % 4 === 0 ? (
                    <div className="h-4 animate-pulse rounded bg-muted" />
                  ) : (
                    shown.map((p) => (
                      <PostChip key={p.id} post={p} onOpen={() => setOpenId(p.id)} />
                    ))
                  )}
                  {list.length > MAX_PER_DAY && (
                    <button
                      type="button"
                      onClick={() => setExpanded(showAll ? null : key)}
                      className="w-full px-1 text-left text-[11px] text-muted-foreground hover:text-foreground"
                    >
                      {showAll ? "Thu gọn" : `+${list.length - MAX_PER_DAY} bài khác`}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <PostDetailSheet
        post={open}
        optionOf={optionOf}
        onOpenChange={(o) => !o && setOpenId(null)}
      />
    </div>
  );
}

/** Built on GET /posts with from / to (there is no dedicated calendar endpoint). */
export function CalendarPage() {
  return (
    <RequireApiKey>
      <CalendarContent />
    </RequireApiKey>
  );
}

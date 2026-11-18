import { ChartLine, ExternalLink, Info, Table2, TriangleAlert } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { useBrands } from "@/features/connections";
import { PageHeader } from "@/shared/components/page-header";
import { PlatformIcon } from "@/shared/components/platform-icon";
import { EmptyState, ErrorState, RequireApiKey } from "@/shared/components/state-views";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { getPlatform, PLATFORMS } from "@/shared/config/platforms";
import { cn } from "@/shared/lib/utils";
import { openExternal } from "@/shared/platform/opener";

import { useAnalyticsOverview } from "../api/analytics";
import type { AnalyticsOverview, OverviewParams, OverviewSort } from "../api/types";
import { BarList, BestTimesHeatmap, StatTile, TimeChart } from "../components/charts";
import { dmy, fmtCompact, fmtFull } from "../lib/format";

const ALL = "all";
/** API limit for from–to. */
const MAX_RANGE_DAYS = 400;

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return ymd(d);
};
const localTz = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

type Preset = "7" | "30" | "90" | "month" | "custom";
const PRESETS: { value: Preset; label: string }[] = [
  { value: "7", label: "7 ngày" },
  { value: "30", label: "30 ngày" },
  { value: "90", label: "90 ngày" },
  { value: "month", label: "Tháng này" },
  { value: "custom", label: "Tuỳ chọn" },
];

function rangeOf(p: Preset, custom: { from: string; to: string }) {
  if (p === "custom") return custom;
  if (p === "month") {
    const now = new Date();
    return { from: ymd(new Date(now.getFullYear(), now.getMonth(), 1)), to: ymd(now) };
  }
  // Inclusive: 7 days = today and the 6 before.
  return { from: daysAgo(Number(p) - 1), to: ymd(new Date()) };
}

/** Readable names for media_type (unknown values shown as-is). */
const FORMAT_LABEL: Record<string, string> = {
  image: "Ảnh",
  video: "Video",
  reel: "Reel",
  reels: "Reel",
  carousel_album: "Album / carousel",
  carousel: "Album / carousel",
  story: "Story",
  stories: "Story",
  text: "Chữ",
  unknown: "Không rõ",
};

const ACTIVITY_LABEL: Record<string, string> = {
  replies_sent: "Trả lời bình luận",
  private_replies_sent: "Nhắn riêng từ bình luận",
  dms_sent: "Tin nhắn đã gửi",
  mentions_answered: "Trả lời nhắc tên",
  reviews_answered: "Trả lời đánh giá",
  comments_moderated: "Bình luận đã ẩn / xoá",
  replies_failed: "Trả lời thất bại",
};

const SORTS: { value: OverviewSort; label: string }[] = [
  { value: "engagements", label: "Tương tác" },
  { value: "views", label: "Lượt xem" },
  { value: "likes", label: "Thích" },
  { value: "comments", label: "Bình luận" },
  { value: "shares", label: "Chia sẻ" },
];

const dateTime = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function Card({
  title,
  hint,
  action,
  children,
  className,
}: {
  title: string;
  hint?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-3 rounded-xl border bg-card p-4", className)}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function DailySection({ data }: { data: AnalyticsOverview }) {
  const [table, setTable] = useState(false);
  const toggle = (
    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setTable(!table)}>
      <Table2 /> {table ? "Biểu đồ" : "Bảng"}
    </Button>
  );
  if (table) {
    return (
      <Card title="Theo ngày" action={toggle} className="lg:col-span-2">
        <div className="max-h-72 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card text-xs text-muted-foreground">
              <tr className="border-b">
                <th className="py-1.5 text-left font-medium">Ngày</th>
                <th className="py-1.5 text-right font-medium">Bài đăng</th>
                <th className="py-1.5 text-right font-medium">Tương tác</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {data.by_day.map((d) => (
                <tr key={d.day} className="border-b last:border-0">
                  <td className="py-1">{dmy(d.day)}</td>
                  <td className="py-1 text-right">{fmtFull(d.posts)}</td>
                  <td className="py-1 text-right">{fmtFull(d.engagements)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    );
  }
  return (
    <>
      <Card
        title="Tương tác theo ngày"
        hint="Thích + bình luận + chia sẻ + lưu của các bài đăng trong ngày"
        action={toggle}
      >
        <TimeChart
          kind="line"
          label="tương tác"
          data={data.by_day.map((d) => ({ day: d.day, value: d.engagements }))}
          tooltip={(i) => (
            <p className="text-muted-foreground">{fmtFull(data.by_day[i].posts)} bài đăng</p>
          )}
        />
      </Card>
      <Card title="Số bài đăng mỗi ngày">
        <TimeChart
          kind="column"
          label="bài đăng"
          data={data.by_day.map((d) => ({ day: d.day, value: d.posts }))}
        />
      </Card>
    </>
  );
}

function Overview({ data }: { data: AnalyticsOverview }) {
  const t = data.totals;
  const p = data.previous;
  const activity = data.activity
    .map((s) => ({ metric: s.metric, total: s.points.reduce((a, x) => a + x.value, 0) }))
    .filter((a) => a.total > 0 || a.metric !== "replies_failed");

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Bài đã đăng"
          value={t.posts}
          previous={p.posts}
          hint="Bài đăng lên 2 kênh tính là 2"
        />
        <StatTile
          label="Tương tác"
          value={t.engagements}
          previous={p.engagements}
          hint="Thích + bình luận + chia sẻ + lưu"
        />
        <StatTile
          label="Lượt xem"
          value={t.views}
          previous={p.views}
          hint="Chỉ kênh có báo lượt xem"
        />
        <StatTile
          label="Tương tác / bài"
          value={t.posts ? Math.round(t.engagements / t.posts) : 0}
          previous={p.posts ? Math.round(p.engagements / p.posts) : 0}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Thích" value={t.likes} previous={p.likes} />
        <StatTile label="Bình luận" value={t.comments} previous={p.comments} />
        <StatTile label="Chia sẻ" value={t.shares} previous={p.shares} />
        <StatTile label="Lưu" value={t.saves} previous={p.saves} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DailySection data={data} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Tương tác theo kênh" hint="Rê chuột lên dòng để xem chi tiết">
          {data.by_platform.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có bài đăng trong khoảng này.</p>
          ) : (
            <BarList
              rows={data.by_platform.map((r) => ({
                key: r.platform,
                label: (
                  <span className="inline-flex items-center gap-2">
                    <PlatformIcon platform={r.platform} size="sm" />
                    {getPlatform(r.platform)?.label ?? r.platform}
                  </span>
                ),
                value: r.engagements,
                detail: `${r.posts} bài · ${fmtFull(r.likes)} thích · ${fmtFull(r.comments)} bình luận · ${fmtFull(r.shares)} chia sẻ · ${fmtFull(r.saves)} lưu · ${fmtFull(r.views)} xem`,
              }))}
            />
          )}
        </Card>
        <Card title="Tương tác theo định dạng">
          {data.by_format.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có dữ liệu.</p>
          ) : (
            <BarList
              rows={data.by_format.map((r) => ({
                key: r.media_type,
                label: FORMAT_LABEL[r.media_type] ?? r.media_type,
                value: r.engagements,
                detail: `${r.posts} bài · TB ${fmtFull(r.posts ? Math.round(r.engagements / r.posts) : 0)} tương tác/bài`,
              }))}
            />
          )}
        </Card>
      </div>

      <Card
        title="Khung giờ bài của bạn hiệu quả"
        hint={`Dựa trên ${fmtFull(data.best_times.posts_considered)} bài đã đăng (giờ theo ${data.tz}). Đây là lúc bài CỦA BẠN làm tốt, không phải lúc khán giả online.`}
      >
        {data.best_times.cells.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa đủ bài để phân tích.</p>
        ) : (
          <BestTimesHeatmap cells={data.best_times.cells} />
        )}
      </Card>

      <TopPosts data={data} />

      {activity.length > 0 && (
        <Card
          title="Hoạt động của đội ngũ"
          hint="Thao tác qua SocialAPI trong khoảng này (ngày theo UTC)"
        >
          <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
            {activity.map((a) => (
              <div
                key={a.metric}
                className="flex items-baseline justify-between gap-2 border-b py-1.5 text-sm"
              >
                <span className="text-muted-foreground">
                  {ACTIVITY_LABEL[a.metric] ?? a.metric}
                </span>
                <span className="font-medium tabular-nums">{fmtFull(a.total)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function TopPosts({ data }: { data: AnalyticsOverview }) {
  return (
    <Card title="Bài nổi bật" hint="Tối đa 10 bài, xếp theo chỉ số đã chọn">
      {data.top_posts.length === 0 ? (
        <p className="text-sm text-muted-foreground">Chưa có bài đăng trong khoảng này.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b">
                <th className="py-2 text-left font-medium">Bài</th>
                <th className="py-2 text-right font-medium">Tương tác</th>
                <th className="py-2 text-right font-medium">Thích</th>
                <th className="py-2 text-right font-medium">Bình luận</th>
                <th className="py-2 text-right font-medium">Chia sẻ</th>
                <th className="py-2 text-right font-medium">Xem</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {data.top_posts.map((tp) => (
                <tr key={`${tp.post_id}-${tp.account_id}`} className="border-b last:border-0">
                  <td className="py-2 pr-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      {tp.thumbnail ? (
                        <img
                          src={tp.thumbnail}
                          alt=""
                          loading="lazy"
                          className="size-10 shrink-0 rounded-md bg-muted object-cover"
                        />
                      ) : (
                        <PlatformIcon platform={tp.platform} />
                      )}
                      <div className="min-w-0">
                        <p className="line-clamp-1 max-w-sm">
                          {tp.text || (
                            <span className="text-muted-foreground italic">(không có chữ)</span>
                          )}
                        </p>
                        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <PlatformIcon
                            platform={tp.platform}
                            size="sm"
                            className="size-3.5 [&_svg]:size-2"
                          />
                          {FORMAT_LABEL[tp.media_type] ?? tp.media_type} ·{" "}
                          {dateTime.format(new Date(tp.published_at))}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-2 text-right font-medium">
                    {fmtCompact(tp.metrics.engagements)}
                  </td>
                  <td className="py-2 text-right">{fmtCompact(tp.metrics.likes)}</td>
                  <td className="py-2 text-right">{fmtCompact(tp.metrics.comments)}</td>
                  <td className="py-2 text-right">{fmtCompact(tp.metrics.shares)}</td>
                  <td className="py-2 text-right">{fmtCompact(tp.metrics.views)}</td>
                  <td className="py-2 text-right">
                    {tp.permalink && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title="Mở bài trên nền tảng"
                        onClick={() => openExternal(tp.permalink!)}
                      >
                        <ExternalLink />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function AnalyticsContent() {
  const brands = useBrands();
  const [preset, setPreset] = useState<Preset>("30");
  const [custom, setCustom] = useState({ from: daysAgo(29), to: ymd(new Date()) });
  const [brandId, setBrandId] = useState(ALL);
  const [platform, setPlatform] = useState(ALL);
  const [sort, setSort] = useState<OverviewSort>("engagements");

  const range = rangeOf(preset, custom);
  const spanDays = (new Date(range.to).getTime() - new Date(range.from).getTime()) / 86_400_000 + 1;
  const rangeError =
    range.from > range.to
      ? "Ngày bắt đầu phải trước ngày kết thúc."
      : spanDays > MAX_RANGE_DAYS
        ? `Tối đa ${MAX_RANGE_DAYS} ngày.`
        : null;

  const params: OverviewParams = useMemo(
    () => ({
      ...range,
      tz: localTz(),
      brand_id: brandId === ALL ? undefined : brandId,
      platform: platform === ALL ? undefined : platform,
      sort,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [range.from, range.to, brandId, platform, sort],
  );
  const overview = useAnalyticsOverview(params, !rangeError);
  const data = overview.data;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Thống kê"
        description="Hiệu quả các bài đã đăng: tương tác, lượt xem, kênh, định dạng và khung giờ."
      />

      {/* Filters: one row, date range first; they scope everything below. */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border p-0.5">
          {PRESETS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPreset(p.value)}
              className={cn(
                "rounded-md px-2.5 py-1 text-sm transition-colors hover:bg-muted",
                preset === p.value && "bg-muted font-medium",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        {preset === "custom" && (
          <div className="flex items-center gap-1.5">
            <Input
              type="date"
              className="h-8 w-36"
              value={custom.from}
              max={custom.to}
              onChange={(e) => setCustom({ ...custom, from: e.target.value })}
            />
            <span className="text-muted-foreground">–</span>
            <Input
              type="date"
              className="h-8 w-36"
              value={custom.to}
              min={custom.from}
              max={ymd(new Date())}
              onChange={(e) => setCustom({ ...custom, to: e.target.value })}
            />
          </div>
        )}
        {(brands.data?.length ?? 0) > 1 && (
          <Select value={brandId} onValueChange={setBrandId}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Mọi thương hiệu</SelectItem>
              {brands.data?.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select value={platform} onValueChange={setPlatform}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Mọi kênh</SelectItem>
            {PLATFORMS.filter(
              (p) => !["whatsapp", "telegram", "app_store_connect"].includes(p.slug),
            ).map((p) => (
              <SelectItem key={p.slug} value={p.slug}>
                <PlatformIcon platform={p.slug} size="sm" /> {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v as OverviewSort)}>
          <SelectTrigger className="w-44">
            <span className="text-muted-foreground">Xếp top theo</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORTS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {rangeError && <p className="text-sm text-destructive">{rangeError}</p>}

      {data && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Info className="size-3.5" />
            {dmy(data.from)} – {dmy(data.to)} ({data.tz}) · so với {spanDays} ngày liền trước
          </span>
          <span>
            {data.metrics_synced_at
              ? `Số liệu cập nhật lần cuối: ${dateTime.format(new Date(data.metrics_synced_at))}`
              : "Chưa có lần cập nhật số liệu nào trong khoảng này"}
          </span>
          {data.accounts_excluded > 0 && (
            <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400">
              <TriangleAlert className="size-3.5" />
              {data.accounts_excluded} tài khoản không được tính (chưa cấp quyền xem thống kê)
            </span>
          )}
        </div>
      )}

      {overview.error ? (
        <ErrorState error={overview.error} onRetry={() => overview.refetch()} />
      ) : !data ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
      ) : data.totals.posts === 0 && data.previous.posts === 0 ? (
        <EmptyState
          icon={ChartLine}
          title="Chưa có bài đăng trong khoảng này"
          description="Thống kê tính trên các bài đã đăng (kể cả bài đồng bộ từ nền tảng). Thử chọn khoảng thời gian dài hơn."
        />
      ) : (
        // Refetch keeps the frame: previous data stays, dimmed, while loading.
        <div className={cn("transition-opacity", overview.isPlaceholderData && "opacity-60")}>
          <Overview data={data} />
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Lưu ý: Instagram có thể trễ tới 48 giờ, TikTok 24–48 giờ (chỉ 20 bài gần nhất); LinkedIn và
        Pinterest không có số liệu theo bài; Google luôn 0. Chỉ số nền tảng không báo sẽ là 0.
      </p>
    </div>
  );
}

/**
 * GET /analytics/overview — stored counters, no platform call, no credits.
 * Docs: guides/analytics, api-reference/analytics/get-analytics-overview.
 */
export function AnalyticsPage() {
  return (
    <RequireApiKey>
      <AnalyticsContent />
    </RequireApiKey>
  );
}

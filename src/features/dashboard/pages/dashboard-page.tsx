import { Activity, ArrowRight, ChartLine, Eye, FileText, Heart } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router";

import {
  BarList,
  dmy,
  fmtFull,
  StatTile,
  TimeChart,
  useAnalyticsOverview,
  type OverviewParams,
} from "@/features/analytics";
import { useAccounts } from "@/features/connections";
import { useEventsSummary } from "@/features/developer";
import { useApiKey } from "@/shared/api";
import { PageHeader } from "@/shared/components/page-header";
import { PlatformIcon } from "@/shared/components/platform-icon";
import { ErrorState } from "@/shared/components/state-views";
import { Button } from "@/shared/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { getPlatform } from "@/shared/config/platforms";
import { cn } from "@/shared/lib/utils";

import { WelcomeOnboarding } from "../components/welcome-onboarding";

const RANGES = [
  { value: "7", label: "7 ngày qua" },
  { value: "30", label: "30 ngày qua" },
  { value: "90", label: "90 ngày qua" },
];

const EVENT_CATEGORY_LABEL: Record<string, string> = {
  post: "Bài đăng",
  inbox: "Hộp thư",
  account: "Tài khoản",
  webhook: "Webhook",
  automation: "Tự động hoá",
};

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return ymd(d);
};
const localTz = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

function Card({
  title,
  hint,
  children,
  className,
}: {
  title: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-3 rounded-xl border bg-card p-4", className)}>
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

/** 4th tile: SocialAPI activity from the event log (needs analytics:read, may be refused). */
function EventsTile({ from }: { from: string }) {
  const summary = useEventsSummary(from);
  if (summary.isLoading) return <Skeleton className="h-[106px] rounded-xl" />;
  const s = summary.data;
  if (!s) {
    return (
      <div
        className="space-y-1 rounded-xl p-4 text-white shadow-sm"
        style={{ background: "var(--tile-cyan)" }}
      >
        <p className="text-sm text-white/85">Hoạt động API</p>
        <p className="text-2xl font-semibold">—</p>
        <p className="text-xs text-white/85">Key hiện tại không xem được nhật ký sự kiện</p>
      </div>
    );
  }
  return (
    <StatTile
      label="Hoạt động API"
      value={s.total}
      previous={s.total_previous}
      hint={`${fmtFull(s.failed)} sự kiện thất bại trong khoảng này`}
      solid="var(--tile-cyan)"
      icon={Activity}
    />
  );
}

function EventsByCategory({ from }: { from: string }) {
  const summary = useEventsSummary(from);
  const rows = Object.entries(summary.data?.by_category ?? {})
    .sort((a, b) => b[1] - a[1])
    .map(([k, n]) => ({ key: k, label: EVENT_CATEGORY_LABEL[k] ?? k, value: n }));

  return (
    <Card
      title="Hoạt động theo nhóm"
      hint={
        summary.data
          ? `${fmtFull(summary.data.failed)} thất bại / ${fmtFull(summary.data.total)} sự kiện`
          : "Từ nhật ký sự kiện SocialAPI"
      }
    >
      {summary.isLoading ? (
        <Skeleton className="h-40 rounded-lg" />
      ) : !summary.data ? (
        <p className="text-sm text-muted-foreground">Không xem được nhật ký sự kiện.</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Chưa có hoạt động trong khoảng này.</p>
      ) : (
        <BarList rows={rows} />
      )}
      <Link
        to="/events"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        Xem nhật ký <ArrowRight className="size-3" />
      </Link>
    </Card>
  );
}

function DashboardContent() {
  const [range, setRange] = useState("30");
  const params: OverviewParams = useMemo(
    () => ({ from: daysAgo(Number(range) - 1), to: ymd(new Date()), tz: localTz() }),
    [range],
  );
  // Event log takes RFC3339: start of the first local day.
  const eventsFrom = useMemo(
    () => new Date(`${params.from}T00:00:00`).toISOString(),
    [params.from],
  );
  const overview = useAnalyticsOverview(params);
  const data = overview.data;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Tổng quan"
        description="Hiệu suất bài đăng và hoạt động trên mọi kênh đã kết nối."
        actions={
          <>
            <Select value={range} onValueChange={setRange}>
              <SelectTrigger size="sm" className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RANGES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button asChild variant="outline" size="sm">
              <Link to="/analytics">
                <ChartLine /> Thống kê chi tiết
              </Link>
            </Button>
          </>
        }
      />

      {overview.error ? (
        <ErrorState error={overview.error} onRetry={() => overview.refetch()} />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {data ? (
              <>
                <StatTile
                  label="Bài đã đăng"
                  value={data.totals.posts}
                  previous={data.previous.posts}
                  hint="Bài đăng lên 2 kênh tính là 2"
                  solid="var(--tile-blue)"
                  icon={FileText}
                />
                <StatTile
                  label="Tương tác"
                  value={data.totals.engagements}
                  previous={data.previous.engagements}
                  hint="Thích + bình luận + chia sẻ + lưu"
                  solid="var(--tile-indigo)"
                  icon={Heart}
                />
                <StatTile
                  label="Lượt xem"
                  value={data.totals.views}
                  previous={data.previous.views}
                  hint="Chỉ kênh có báo lượt xem"
                  solid="var(--tile-teal)"
                  icon={Eye}
                />
              </>
            ) : (
              [0, 1, 2].map((i) => <Skeleton key={i} className="h-[106px] rounded-xl" />)
            )}
            <EventsTile from={eventsFrom} />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card
              title="Tương tác theo ngày"
              hint="Thích + bình luận + chia sẻ + lưu của các bài đăng trong ngày"
              className="lg:col-span-2"
            >
              {data ? (
                <TimeChart
                  kind="line"
                  label="tương tác"
                  height={240}
                  data={data.by_day.map((d) => ({ day: d.day, value: d.engagements }))}
                  tooltip={(i) => (
                    <p className="text-muted-foreground">
                      {fmtFull(data.by_day[i].posts)} bài đăng
                    </p>
                  )}
                />
              ) : (
                <Skeleton className="h-60 rounded-lg" />
              )}
            </Card>

            <Card title="Tương tác theo kênh" hint="Rê chuột lên dòng để xem chi tiết">
              {!data ? (
                <Skeleton className="h-40 rounded-lg" />
              ) : data.by_platform.length === 0 ? (
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
                    detail: `${r.posts} bài · ${fmtFull(r.views)} lượt xem`,
                  }))}
                />
              )}
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card title="Số bài đăng mỗi ngày" className="lg:col-span-2">
              {data ? (
                <TimeChart
                  kind="column"
                  label="bài đăng"
                  data={data.by_day.map((d) => ({ day: d.day, value: d.posts }))}
                />
              ) : (
                <Skeleton className="h-56 rounded-lg" />
              )}
            </Card>
            <EventsByCategory from={eventsFrom} />
          </div>

          {data && (
            <p className="text-xs text-muted-foreground">
              {dmy(data.from)} – {dmy(data.to)} ({data.tz}), so với cùng số ngày liền trước.
              {data.accounts_excluded > 0 &&
                ` ${data.accounts_excluded} tài khoản không được tính (chưa cấp quyền xem thống kê).`}
            </p>
          )}
        </>
      )}
    </div>
  );
}

/**
 * SocialAPI endpoints for this screen:
 *   GET /analytics/overview
 *   GET /events/summary
 *   GET /accounts (welcome screen until one is connected)
 */
export function DashboardPage() {
  const hasApiKey = useApiKey((s) => !!s.apiKey);
  const accounts = useAccounts(undefined, { enabled: hasApiKey });

  if (hasApiKey && accounts.isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-10 w-64 rounded-lg" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[106px] rounded-xl" />
          ))}
        </div>
      </div>
    );
  }
  // A failed accounts call (bad key, offline) falls through to the dashboard's own error state.
  const hasAccounts = (accounts.data?.length ?? 0) > 0;
  if (!hasApiKey || (accounts.isSuccess && !hasAccounts)) {
    return <WelcomeOnboarding hasApiKey={hasApiKey} hasAccounts={hasAccounts} />;
  }
  return <DashboardContent />;
}

import {
  Activity,
  CircleAlert,
  Loader2,
  RefreshCw,
  ScrollText,
  Search,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import { useState } from "react";

import { useAccounts } from "@/features/connections";
import { CopyButton } from "@/shared/components/copy-button";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { getPlatform, PLATFORMS } from "@/shared/config/platforms";
import { cn } from "@/shared/lib/utils";

import { useEvents, useEventsSummary } from "../api/events";
import type { DevEvent, EventsFilter, EventsSummary } from "../api/types";
import { StatusPill } from "../components/status-pill";
import { dateTimeSec, formatMs, number, prettyJson, timeAgo } from "../lib/format";
import type { Tone } from "../lib/status";

const ALL = "all";

const RANGES = [
  { value: "1", label: "24 giờ qua" },
  { value: "7", label: "7 ngày qua" },
  { value: "30", label: "30 ngày qua" },
  { value: "90", label: "90 ngày qua" },
];

const CATEGORY_LABEL: Record<string, string> = {
  post: "Bài đăng",
  inbox: "Hộp thư",
  account: "Tài khoản",
  webhook: "Webhook",
  automation: "Tự động hoá",
};

const ERROR_CATEGORY_LABEL: Record<string, string> = {
  validation: "Dữ liệu không hợp lệ",
  auth: "Xác thực / quyền",
  rate_limit: "Giới hạn tần suất",
  platform: "Lỗi nền tảng",
  network: "Mạng",
  internal: "Lỗi hệ thống",
  billing: "Gói / thanh toán",
};

const catLabel = (c: string) => CATEGORY_LABEL[c] ?? c;

function eventTone(status: string): Tone {
  if (status === "ok" || status === "success" || status === "delivered") return "ok";
  if (status === "failed" || status === "error") return "fail";
  return "muted";
}

const isoDaysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();

function SummaryCards({ summary }: { summary: EventsSummary }) {
  const failRate = summary.total ? (summary.failed / summary.total) * 100 : 0;
  const prev = summary.total_previous;
  const change = prev ? ((summary.total - prev) / prev) * 100 : null;
  const categories = Object.entries(summary.by_category).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...categories.map(([, n]) => n));
  const errors = Object.entries(summary.by_error_category).sort((a, b) => b[1] - a[1]);
  const inbox = Object.entries(summary.inbox_breakdown).sort((a, b) => b[1] - a[1]);

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-xl border bg-card p-4">
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Activity className="size-3.5" /> Tổng sự kiện
        </p>
        <p className="mt-1 text-2xl font-semibold tabular-nums">{number.format(summary.total)}</p>
        {change != null && (
          <p
            className={cn(
              "mt-0.5 flex items-center gap-1 text-xs",
              change >= 0 ? "text-green-700 dark:text-green-400" : "text-muted-foreground",
            )}
          >
            {change >= 0 ? (
              <TrendingUp className="size-3.5" />
            ) : (
              <TrendingDown className="size-3.5" />
            )}
            {change >= 0 ? "+" : ""}
            {change.toFixed(0)}% so với kỳ trước
          </p>
        )}
      </div>

      <div className="rounded-xl border bg-card p-4">
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CircleAlert className="size-3.5" /> Thất bại
        </p>
        <p
          className={cn(
            "mt-1 text-2xl font-semibold tabular-nums",
            summary.failed > 0 && "text-destructive",
          )}
        >
          {number.format(summary.failed)}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">{failRate.toFixed(1)}% tổng số</p>
        {errors.length > 0 && (
          <ul className="mt-2 space-y-0.5 text-xs">
            {errors.slice(0, 4).map(([k, n]) => (
              <li key={k} className="flex justify-between gap-2">
                <span className="truncate text-muted-foreground">
                  {ERROR_CATEGORY_LABEL[k] ?? k}
                </span>
                <span className="tabular-nums">{number.format(n)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl border bg-card p-4">
        <p className="text-xs text-muted-foreground">Theo nhóm</p>
        {categories.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">—</p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {categories.map(([k, n]) => (
              <li key={k} className="space-y-0.5 text-xs">
                <div className="flex justify-between">
                  <span>{catLabel(k)}</span>
                  <span className="tabular-nums">{number.format(n)}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(n / max) * 100}%`, background: "var(--viz-series)" }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl border bg-card p-4">
        <p className="text-xs text-muted-foreground">Hộp thư</p>
        {inbox.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">Không có hoạt động hộp thư.</p>
        ) : (
          <ul className="mt-2 space-y-0.5 text-xs">
            {inbox.map(([k, n]) => (
              <li key={k} className="flex justify-between gap-2">
                <span className="truncate font-mono text-muted-foreground">{k}</span>
                <span className="tabular-nums">{number.format(n)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function EventSheet({
  event,
  accountName,
  onClose,
}: {
  event: DevEvent | null;
  accountName?: string;
  onClose: () => void;
}) {
  const rows: [string, React.ReactNode][] = event
    ? [
        ["Event ID", event.id],
        ["Nhóm", catLabel(event.category)],
        ["Hành động", <code className="font-mono">{event.action}</code>],
        ["Thời điểm", dateTimeSec.format(new Date(event.created_at))],
        ...(event.platform
          ? [["Nền tảng", getPlatform(event.platform)?.label ?? event.platform] as [string, string]]
          : []),
        ...(event.account_id
          ? [["Tài khoản", accountName ?? event.account_id] as [string, string]]
          : []),
        ...(event.resource_id ? [["Resource ID", event.resource_id] as [string, string]] : []),
        ...(event.status_code != null
          ? [["HTTP", String(event.status_code)] as [string, string]]
          : []),
        ...(event.duration_ms != null
          ? [["Thời gian xử lý", formatMs(event.duration_ms)] as [string, string]]
          : []),
        ...(event.error_category
          ? [
              ["Loại lỗi", ERROR_CATEGORY_LABEL[event.error_category] ?? event.error_category] as [
                string,
                string,
              ],
            ]
          : []),
      ]
    : [];

  return (
    <Sheet open={!!event} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full gap-0 sm:max-w-lg">
        <SheetHeader className="border-b">
          <SheetTitle>{event?.summary ?? ""}</SheetTitle>
          <SheetDescription className="flex items-center gap-2">
            {event && (
              <StatusPill tone={eventTone(event.status)}>
                {eventTone(event.status) === "ok" ? "Thành công" : event.status}
              </StatusPill>
            )}
          </SheetDescription>
        </SheetHeader>
        {event && (
          <div className="flex-1 space-y-5 overflow-y-auto p-4">
            {event.error_message && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                {event.error_message}
              </div>
            )}
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs">
              {rows.map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="break-all">{v}</dd>
                </div>
              ))}
            </dl>
            {event.metadata && Object.keys(event.metadata).length > 0 && (
              <section className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">Metadata</h3>
                  <CopyButton value={prettyJson(event.metadata)} />
                </div>
                <pre className="max-h-96 overflow-auto rounded-lg border bg-muted/40 p-3 font-mono text-xs">
                  {prettyJson(event.metadata)}
                </pre>
              </section>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function EventsContent() {
  const accounts = useAccounts();
  const [range, setRange] = useState("7");
  const [from, setFrom] = useState(() => isoDaysAgo(7));
  const [category, setCategory] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [platform, setPlatform] = useState(ALL);
  const [accountId, setAccountId] = useState(ALL);
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [open, setOpen] = useState<DevEvent | null>(null);

  const filter: EventsFilter = {
    from,
    ...(category !== ALL && { category }),
    ...(status !== ALL && { status }),
    ...(platform !== ALL && { platform }),
    ...(accountId !== ALL && { account_id: accountId }),
    ...(action && { action }),
  };
  const summary = useEventsSummary(from);
  const events = useEvents(filter);
  const byId = new Map((accounts.data ?? []).map((a) => [a.id, a]));
  const accountName = (id?: string) => {
    const a = id ? byId.get(id) : undefined;
    return a ? (a.page_name ?? a.name) : undefined;
  };
  const categories = [
    ...new Set([...Object.keys(CATEGORY_LABEL), ...Object.keys(summary.data?.by_category ?? {})]),
  ];
  const filtered =
    category !== ALL || status !== ALL || platform !== ALL || accountId !== ALL || !!action;

  const refresh = () => {
    setFrom(isoDaysAgo(Number(range)));
  };

  const clearFilters = () => {
    setCategory(ALL);
    setStatus(ALL);
    setPlatform(ALL);
    setAccountId(ALL);
    setSearch("");
    setAction("");
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Nhật ký sự kiện"
        description="Toàn bộ hoạt động qua SocialAPI: bài đăng, hộp thư, tài khoản và lượt gửi webhook."
        actions={
          <>
            <Select
              value={range}
              onValueChange={(v) => {
                setRange(v);
                setFrom(isoDaysAgo(Number(v)));
              }}
            >
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
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Làm mới"
              title="Làm mới"
              onClick={refresh}
            >
              <RefreshCw
                className={cn((events.isFetching || summary.isFetching) && "animate-spin")}
              />
            </Button>
          </>
        }
      />

      {summary.error ? (
        <ErrorState error={summary.error} onRetry={() => summary.refetch()} />
      ) : summary.data ? (
        <SummaryCards summary={summary.data} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <form
          className="relative"
          onSubmit={(e) => {
            e.preventDefault();
            setAction(search.trim());
          }}
        >
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-8 w-56 pl-8 font-mono text-xs"
            placeholder="Hành động, vd. post.published"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onBlur={() => setAction(search.trim())}
          />
        </form>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger size="sm" className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Mọi nhóm</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {catLabel(c)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger size="sm" className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Mọi kết quả</SelectItem>
            <SelectItem value="ok">Thành công</SelectItem>
            <SelectItem value="failed">Thất bại</SelectItem>
          </SelectContent>
        </Select>
        <Select value={platform} onValueChange={setPlatform}>
          <SelectTrigger size="sm" className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Mọi nền tảng</SelectItem>
            {PLATFORMS.map((p) => (
              <SelectItem key={p.slug} value={p.slug}>
                <PlatformIcon platform={p.slug} size="sm" /> {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(accounts.data?.length ?? 0) > 0 && (
          <Select value={accountId} onValueChange={setAccountId}>
            <SelectTrigger size="sm" className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Mọi tài khoản</SelectItem>
              {accounts.data?.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  <PlatformIcon platform={a.platform} size="sm" /> {a.page_name ?? a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {filtered && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X /> Xoá lọc
          </Button>
        )}
      </div>

      {events.error ? (
        <ErrorState error={events.error} onRetry={() => events.refetch()} />
      ) : events.isLoading ? (
        <Skeleton className="h-72 rounded-xl" />
      ) : events.events.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title={filtered ? "Không có sự kiện khớp bộ lọc" : "Chưa có sự kiện trong khoảng này"}
          description="Sự kiện được ghi lại khi bạn đăng bài, nhận / trả lời tin nhắn, kết nối tài khoản hoặc SocialAPI gửi webhook."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Sự kiện</th>
                <th className="px-3 py-2 text-left font-medium">Nhóm</th>
                <th className="px-3 py-2 text-left font-medium">Tài khoản</th>
                <th className="px-3 py-2 text-left font-medium">Kết quả</th>
                <th className="px-3 py-2 text-right font-medium">Thời điểm</th>
              </tr>
            </thead>
            <tbody>
              {events.events.map((e) => {
                const tone = eventTone(e.status);
                return (
                  <tr
                    key={e.id}
                    className="cursor-pointer border-t hover:bg-muted/40"
                    onClick={() => setOpen(e)}
                  >
                    <td className="px-3 py-2">
                      <p className="max-w-md truncate">{e.summary}</p>
                      <p className="font-mono text-xs text-muted-foreground">{e.action}</p>
                    </td>
                    <td className="px-3 py-2 text-xs">{catLabel(e.category)}</td>
                    <td className="px-3 py-2">
                      {e.platform || e.account_id ? (
                        <span className="flex items-center gap-1.5 text-xs">
                          {e.platform && <PlatformIcon platform={e.platform} size="sm" />}
                          <span className="max-w-40 truncate">
                            {accountName(e.account_id) ??
                              getPlatform(e.platform ?? "")?.label ??
                              e.platform}
                          </span>
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <StatusPill tone={tone}>
                        {tone === "ok" ? "Thành công" : tone === "fail" ? "Thất bại" : e.status}
                      </StatusPill>
                      {e.error_message && (
                        <p className="mt-0.5 max-w-56 truncate text-xs text-destructive">
                          {e.error_message}
                        </p>
                      )}
                    </td>
                    <td
                      className="px-3 py-2 text-right text-xs text-muted-foreground tabular-nums"
                      title={dateTimeSec.format(new Date(e.created_at))}
                    >
                      {timeAgo(e.created_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {events.hasNextPage && (
            <div className="border-t p-2 text-center">
              <Button
                variant="ghost"
                size="sm"
                disabled={events.isFetchingNextPage}
                onClick={() => events.fetchNextPage()}
              >
                {events.isFetchingNextPage && <Loader2 className="animate-spin" />} Tải thêm
              </Button>
            </div>
          )}
        </div>
      )}

      {events.retentionDays != null && (
        <p className="text-xs text-muted-foreground">
          Gói hiện tại lưu nhật ký {events.retentionDays} ngày — sự kiện cũ hơn không còn truy vấn
          được.
        </p>
      )}

      <EventSheet
        event={open}
        accountName={accountName(open?.account_id)}
        onClose={() => setOpen(null)}
      />
    </div>
  );
}

/**
 * SocialAPI endpoints for this screen (scope analytics:read):
 *   GET /events
 *   GET /events/summary
 */
export function EventsPage() {
  return (
    <RequireApiKey>
      <EventsContent />
    </RequireApiKey>
  );
}

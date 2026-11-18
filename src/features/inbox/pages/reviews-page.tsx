import { Loader2, RefreshCw, Star, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router";

import { PageHeader } from "@/shared/components/page-header";
import { PlatformIcon } from "@/shared/components/platform-icon";
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
import { getPlatform } from "@/shared/config/platforms";
import { cn } from "@/shared/lib/utils";

import {
  useReviewAccounts,
  useReviewEvents,
  useReviews,
  type ReviewAccount,
  type ReviewOrder,
} from "../reviews/api";
import { ReviewCard, Stars } from "../reviews/review-card";

const ORDERS: { value: ReviewOrder; label: string }[] = [
  { value: "newest", label: "Mới nhất" },
  { value: "rating_asc", label: "Sao thấp trước" },
  { value: "rating_desc", label: "Sao cao trước" },
];

type ReplyFilter = "all" | "unreplied" | "rejected";
const dateFmt = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function AccountItem({
  account: a,
  active,
  onClick,
}: {
  account: ReviewAccount;
  active: boolean;
  onClick: () => void;
}) {
  const asc = getPlatform(a.platform)?.slug === "app_store_connect";
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors hover:bg-muted/60",
        active && "border-primary bg-primary/5 hover:bg-primary/10",
      )}
    >
      <PlatformIcon platform={a.platform} />
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="truncate text-sm font-medium">{a.name}</p>
        {a.status === "ok" ? (
          <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
            {/* App Store Connect always reports 0 as the average. */}
            {!asc && a.average_rating !== null && (
              <span className="inline-flex items-center gap-1">
                <Star className="size-3 fill-amber-400 text-amber-400" />
                {a.average_rating.toFixed(1)}
              </span>
            )}
            {a.total_count !== null && (
              <span>{a.total_count.toLocaleString("vi-VN")} đánh giá</span>
            )}
            {a.last_review_at && (
              <span>· mới nhất {dateFmt.format(new Date(a.last_review_at))}</span>
            )}
          </div>
        ) : (
          <p className="flex items-center gap-1 text-xs text-destructive">
            <TriangleAlert className="size-3" />
            {a.status === "reconnection_required" ? "Cần kết nối lại" : "Không đọc được"}
          </p>
        )}
      </div>
    </button>
  );
}

function ReviewList({ account }: { account: ReviewAccount }) {
  const [order, setOrder] = useState<ReviewOrder>("newest");
  const [filter, setFilter] = useState<ReplyFilter>("all");
  const reviews = useReviews(account.account_id, order);
  const google = getPlatform(account.platform)?.slug === "google";

  // Not an API filter: applies to the reviews loaded so far.
  const shown = useMemo(
    () =>
      reviews.reviews.filter((r) =>
        filter === "unreplied"
          ? !r.reply
          : filter === "rejected"
            ? r.reply?.state === "REJECTED"
            : true,
      ),
    [reviews.reviews, filter],
  );

  if (account.status === "reconnection_required") {
    return (
      <EmptyState
        icon={TriangleAlert}
        title="Tài khoản cần kết nối lại"
        description="SocialAPI không đọc được đánh giá của tài khoản này cho tới khi kết nối lại."
        action={
          <Button asChild size="sm">
            <Link to="/accounts">Đến Tài khoản</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      {reviews.summary && (
        <div className="flex flex-wrap items-center gap-4 rounded-xl border bg-card p-4">
          {!(getPlatform(account.platform)?.slug === "app_store_connect") && (
            <div className="flex items-center gap-3">
              <span className="text-3xl font-semibold">
                {reviews.summary.average_rating.toFixed(1)}
              </span>
              <Stars value={reviews.summary.average_rating} size="md" />
            </div>
          )}
          <span className="text-sm text-muted-foreground">
            {reviews.summary.total_count.toLocaleString("vi-VN")} đánh giá
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto"
            disabled={reviews.isFetching}
            onClick={() => reviews.refetch()}
          >
            <RefreshCw className={cn(reviews.isFetching && "animate-spin")} /> Tải lại
          </Button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border p-0.5">
          {(
            [
              ["all", "Tất cả"],
              ["unreplied", "Chưa trả lời"],
              ...(google ? [["rejected", "Bị Google từ chối"]] : []),
            ] as [ReplyFilter, string][]
          ).map(([v, label]) => (
            <button
              key={v}
              type="button"
              onClick={() => setFilter(v)}
              className={cn(
                "rounded-md px-2.5 py-1 text-sm transition-colors hover:bg-muted",
                filter === v && "bg-muted font-medium",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <Select value={order} onValueChange={(v) => setOrder(v as ReviewOrder)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ORDERS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {filter !== "all" && (
          <span className="text-xs text-muted-foreground">
            Lọc trong {reviews.reviews.length} đánh giá đã tải
          </span>
        )}
      </div>

      {reviews.error ? (
        <ErrorState error={reviews.error} onRetry={() => reviews.refetch()} />
      ) : reviews.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <p className="rounded-xl border border-dashed py-10 text-center text-sm text-muted-foreground">
          {reviews.reviews.length === 0 ? "Chưa có đánh giá nào." : "Không có đánh giá phù hợp."}
        </p>
      ) : (
        <div className="space-y-3">
          {shown.map((r) => (
            <ReviewCard key={r.id} review={r} accountId={account.account_id} google={google} />
          ))}
        </div>
      )}

      {reviews.hasNextPage && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            disabled={reviews.isFetchingNextPage}
            onClick={() => reviews.fetchNextPage()}
          >
            {reviews.isFetchingNextPage && <Loader2 className="animate-spin" />} Tải thêm
          </Button>
        </div>
      )}
    </div>
  );
}

function ReviewsContent() {
  useReviewEvents();
  const accounts = useReviewAccounts();
  const [selected, setSelected] = useState<string>();
  const list = accounts.data ?? [];
  const account = list.find((a) => a.account_id === selected) ?? list[0];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Đánh giá"
        description="Đánh giá từ Google Business Profile và App Store Connect. Mỗi đánh giá có một trả lời — gửi lại sẽ thay thế."
      />

      {accounts.error ? (
        <ErrorState error={accounts.error} onRetry={() => accounts.refetch()} />
      ) : accounts.isLoading ? (
        <Skeleton className="h-48 rounded-xl" />
      ) : list.length === 0 ? (
        <EmptyState
          icon={Star}
          title="Chưa có tài khoản nhận đánh giá"
          description="Kết nối Google Business Profile (địa điểm đã xác minh) hoặc App Store Connect để quản lý đánh giá. Facebook đã ngừng cung cấp đánh giá Page."
          action={
            <Button asChild size="sm">
              <Link to="/accounts">Kết nối tài khoản</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <aside className="space-y-2 lg:sticky lg:top-4 lg:self-start">
            {list.map((a) => (
              <AccountItem
                key={a.account_id}
                account={a}
                active={a.account_id === account?.account_id}
                onClick={() => setSelected(a.account_id)}
              />
            ))}
          </aside>
          {account && <ReviewList key={account.account_id} account={account} />}
        </div>
      )}
    </div>
  );
}

/**
 * SocialAPI endpoints for this screen:
 *   GET /inbox/reviews, GET /inbox/reviews/{account_id}, POST /inbox/reviews/{review_id}/reply
 */
export function ReviewsPage() {
  return (
    <RequireApiKey>
      <ReviewsContent />
    </RequireApiKey>
  );
}

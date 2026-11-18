import { AtSign, Info, Loader2, RefreshCw, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router";

import { useAccounts, type SocialAccount } from "@/features/connections";
import { AccountAvatar } from "@/shared/components/account-avatar";
import { PageHeader } from "@/shared/components/page-header";
import { EmptyState, ErrorState, RequireApiKey } from "@/shared/components/state-views";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { getPlatform, type PlatformSlug } from "@/shared/config/platforms";
import { cn } from "@/shared/lib/utils";

import { mentionsSupported, useMentionEvents, useMentions } from "../mentions/api";
import { MentionCard } from "../mentions/mention-card";

/** What each platform's list actually contains (guides/mentions). */
const PLATFORM_NOTE: Partial<Record<PlatformSlug, string>> = {
  instagram:
    "Instagram: chỉ liệt kê bài có GẮN THẺ tài khoản. @nhắc trong caption / bình luận chỉ tới qua realtime.",
  facebook: "Facebook: bài có gắn thẻ Page. Nhắc trong bình luận chỉ tới qua realtime.",
  threads:
    "Threads: bài công khai gắn thẻ tài khoản, chỉ 1 trang kết quả. Kết nối trước 17/10/2026 cần kết nối lại.",
  tiktok:
    "TikTok: nhắc trong caption và bình luận, chỉ tài khoản Business, trễ 24–48 giờ — app chỉ tải lại vài giờ một lần. Chỉ trả lời được nhắc trong bình luận.",
  linkedin: "LinkedIn: chỉ Company Page, 60 ngày gần nhất.",
  twitter: "X: xem được lượt nhắc nhưng không trả lời được qua API.",
  bluesky: "Bluesky: bài có nhắc tới tài khoản.",
};

function MentionList({ account }: { account: SocialAccount }) {
  const mentions = useMentions(account);
  const [query, setQuery] = useState("");
  const [replied, setReplied] = useState<Set<string>>(new Set());
  const slug = getPlatform(account.platform)?.slug;
  const q = query.trim().toLowerCase();
  const shown = useMemo(
    () =>
      mentions.mentions.filter(
        (m) =>
          !q ||
          m.content.text.toLowerCase().includes(q) ||
          (m.author.name ?? "").toLowerCase().includes(q) ||
          (m.author.username ?? "").toLowerCase().includes(q),
      ),
    [mentions.mentions, q],
  );

  return (
    <div className="space-y-4">
      {slug && PLATFORM_NOTE[slug] && (
        <p className="flex items-start gap-2 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          <Info className="mt-px size-3.5 shrink-0" /> {PLATFORM_NOTE[slug]}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Tìm trong nội dung / người nhắc…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={mentions.isFetching}
          onClick={() => mentions.refetch()}
        >
          <RefreshCw className={cn(mentions.isFetching && "animate-spin")} /> Tải lại
        </Button>
      </div>

      {mentions.error ? (
        <ErrorState error={mentions.error} onRetry={() => mentions.refetch()} />
      ) : mentions.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <p className="rounded-xl border border-dashed py-10 text-center text-sm text-muted-foreground">
          {mentions.mentions.length === 0
            ? "Chưa có lượt nhắc nào."
            : "Không có lượt nhắc phù hợp."}
        </p>
      ) : (
        <div className="space-y-3">
          {shown.map((m) => (
            <MentionCard
              key={m.id}
              mention={m}
              accountId={account.id}
              replied={replied.has(m.id)}
              onReplied={() => setReplied((s) => new Set(s).add(m.id))}
            />
          ))}
        </div>
      )}

      {mentions.hasNextPage && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            disabled={mentions.isFetchingNextPage}
            onClick={() => mentions.fetchNextPage()}
          >
            {mentions.isFetchingNextPage && <Loader2 className="animate-spin" />} Tải thêm
          </Button>
        </div>
      )}
    </div>
  );
}

function MentionsContent() {
  useMentionEvents();
  const accounts = useAccounts();
  const [selected, setSelected] = useState<string>();
  const supported = useMemo(() => (accounts.data ?? []).filter(mentionsSupported), [accounts.data]);
  const account = supported.find((a) => a.id === selected) ?? supported[0];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Lượt nhắc"
        description="Bài viết và bình luận nhắc tới hoặc gắn thẻ tài khoản của bạn — trả lời công khai ngay tại đây."
      />

      {accounts.error ? (
        <ErrorState error={accounts.error} onRetry={() => accounts.refetch()} />
      ) : accounts.isLoading ? (
        <Skeleton className="h-48 rounded-xl" />
      ) : supported.length === 0 ? (
        <EmptyState
          icon={AtSign}
          title="Chưa có tài khoản hỗ trợ lượt nhắc"
          description="Lượt nhắc có trên Instagram, Facebook, Threads, TikTok (Business), X, Bluesky và LinkedIn Company Page."
          action={
            <Button asChild size="sm">
              <Link to="/accounts">Kết nối tài khoản</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[16rem_minmax(0,1fr)]">
          <aside className="space-y-1.5 lg:sticky lg:top-4 lg:max-h-[calc(100vh-8rem)] lg:self-start lg:overflow-y-auto">
            {supported.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setSelected(a.id)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors hover:bg-muted/60",
                  a.id === account?.id && "border-primary bg-primary/5 hover:bg-primary/10",
                )}
              >
                <AccountAvatar picture={a.profile_picture_url} platform={a.platform} size="md" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{a.page_name ?? a.name}</p>
                  <p className="text-xs text-muted-foreground">{getPlatform(a.platform)?.label}</p>
                </div>
              </button>
            ))}
          </aside>
          {account && <MentionList key={account.id} account={account} />}
        </div>
      )}
    </div>
  );
}

/**
 * SocialAPI endpoints for this screen:
 *   GET /accounts/{account_id}/mentions, POST /accounts/{account_id}/mentions/reply
 */
export function MentionsPage() {
  return (
    <RequireApiKey>
      <MentionsContent />
    </RequireApiKey>
  );
}

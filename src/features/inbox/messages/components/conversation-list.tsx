import {
  Archive,
  ArchiveRestore,
  Bot,
  CheckCheck,
  Hand,
  Inbox,
  Loader2,
  MoreHorizontal,
  RefreshCw,
  Search,
} from "lucide-react";

import { AccountAvatar } from "@/shared/components/account-avatar";
import { PlatformIcon } from "@/shared/components/platform-icon";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { getPlatform, type PlatformSlug } from "@/shared/config/platforms";
import { cn } from "@/shared/lib/utils";

import { DmBotDialog } from "../bot/bot-dialog";
import { useDmBot } from "../bot/store";
import { ALL_ACCOUNTS, contactName } from "../lib/conversation";
import { formatListTime } from "../lib/format";
import type { InboxSource } from "../lib/sources";
import { useCustomers } from "../store/customers-store";
import type { Conversation } from "../types";
import { ContactAvatar } from "./contact-avatar";
import { ResponderBadge } from "./responder-badge";

export type ListFilter = "all" | "unread" | "handoff" | "archived";

const FILTERS: { value: ListFilter; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "unread", label: "Chưa đọc" },
  { value: "handoff", label: "Cần xử lý" },
  { value: "archived", label: "Lưu trữ" },
];

interface ConversationListProps {
  conversations: Conversation[];
  loading: boolean;
  selectedId?: string;
  onSelect: (c: Conversation) => void;
  /** Filter options: Facebook Pages + other accounts. */
  sources: InboxSource[];
  sourceKey: string;
  onSourceChange: (key: string) => void;
  /** Where a conversation came in (its Page for Facebook). */
  sourceOf: (c: Conversation) => InboxSource | undefined;
  query: string;
  onQueryChange: (q: string) => void;
  filter: ListFilter;
  onFilterChange: (f: ListFilter) => void;
  platforms: PlatformSlug[];
  platform: PlatformSlug | null;
  onPlatformChange: (p: PlatformSlug | null) => void;
  unreadTotal: number;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  syncing: boolean;
  onSync: () => void;
  onMarkRead: (c: Conversation) => void;
  onMarkAllRead: () => void;
  onToggleArchive: (c: Conversation) => void;
  /** Show the "Cần xử lý" tab (DM bot on, or conversations it handed over). */
  showHandoff: boolean;
}

export function ConversationList(props: ConversationListProps) {
  // Re-render when a saved customer name changes (read by contactName).
  useCustomers((s) => s.customers);
  const handoffs = useDmBot((s) => s.paused);
  const resume = useDmBot((s) => s.resume);
  const handoffCount = Object.keys(handoffs).length;
  const {
    conversations,
    loading,
    selectedId,
    onSelect,
    sources,
    sourceKey,
    onSourceChange,
    sourceOf,
    query,
    onQueryChange,
    filter,
    onFilterChange,
    platforms,
    platform,
    onPlatformChange,
    unreadTotal,
  } = props;

  return (
    <aside className="flex w-80 shrink-0 flex-col border-r bg-background xl:w-96">
      <div className="space-y-3 border-b p-3">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            Tin nhắn
            {unreadTotal > 0 && <Badge className="rounded-full px-1.5">{unreadTotal}</Badge>}
          </h2>
          <div className="flex">
            {unreadTotal > 0 && (
              <Button
                variant="ghost"
                size="icon-sm"
                title="Đánh dấu tất cả đã đọc"
                onClick={props.onMarkAllRead}
              >
                <CheckCheck />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon-sm"
              title="Đồng bộ từ các kênh"
              disabled={props.syncing}
              onClick={props.onSync}
            >
              <RefreshCw className={props.syncing ? "animate-spin" : undefined} />
            </Button>
            <DmBotDialog />
          </div>
        </div>

        <Select value={sourceKey} onValueChange={onSourceChange}>
          <SelectTrigger size="sm" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_ACCOUNTS}>Tất cả tài khoản</SelectItem>
            {sources.map((s) => (
              <SelectItem key={s.key} value={s.key}>
                <AccountAvatar picture={s.picture} platform={s.platform} />
                <span className="truncate">{s.name}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-8 pl-8"
            placeholder="Tìm theo tên hoặc tin nhắn…"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
          />
        </div>

        <div className="flex gap-1 rounded-lg bg-muted p-0.5">
          {FILTERS.filter((f) => f.value !== "handoff" || props.showHandoff).map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => onFilterChange(f.value)}
              title={
                f.value === "handoff"
                  ? "Hội thoại AI chatbot đã chuyển cho nhân viên xử lý"
                  : undefined
              }
              className={cn(
                "flex flex-1 items-center justify-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium whitespace-nowrap text-muted-foreground transition-colors",
                filter === f.value && "bg-background text-foreground shadow-sm",
              )}
            >
              {f.label}
              {f.value === "handoff" && handoffCount > 0 && (
                <span className="rounded-full bg-amber-500 px-1.5 text-[10px] leading-4 font-semibold text-white">
                  {handoffCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {platforms.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => onPlatformChange(null)}
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
                platform === null
                  ? "border-primary bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              Mọi kênh
            </button>
            {platforms.map((p) => (
              <button
                key={p}
                type="button"
                title={getPlatform(p)?.label}
                onClick={() => onPlatformChange(platform === p ? null : p)}
                className={cn(
                  "rounded-full p-0.5 transition-opacity",
                  platform && platform !== p && "opacity-40 hover:opacity-100",
                  platform === p && "ring-2 ring-primary ring-offset-1 ring-offset-background",
                )}
              >
                <PlatformIcon platform={p} size="sm" className="rounded-full" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-1 p-3">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-16 text-center text-sm text-muted-foreground">
            {filter === "archived" ? (
              <Archive className="size-8" />
            ) : filter === "handoff" ? (
              <Hand className="size-8" />
            ) : (
              <Inbox className="size-8" />
            )}
            {query
              ? "Không tìm thấy hội thoại."
              : filter === "handoff"
                ? "Không có hội thoại nào cần xử lý. Khi khách đòi gặp người thật hoặc AI không trả lời được, hội thoại sẽ hiện ở đây."
                : "Không có hội thoại nào."}
          </div>
        ) : (
          <>
            {conversations.map((c) => {
              const unread = c.unread_count > 0;
              const name = contactName(c);
              const handoff = handoffs[c.id];
              return (
                <div key={c.id} className="group relative">
                  <button
                    type="button"
                    onClick={() => onSelect(c)}
                    className={cn(
                      "flex w-full items-center gap-3 border-l-2 border-transparent px-3 py-3 text-left transition-colors hover:bg-muted/60",
                      selectedId === c.id && "border-primary bg-primary/5 hover:bg-primary/10",
                    )}
                  >
                    <ContactAvatar
                      name={name}
                      picture={c.participant_picture || undefined}
                      seed={c.participant_id || c.id}
                      platform={c.platform}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <p
                            className={cn(
                              "truncate text-sm",
                              unread ? "font-semibold" : "font-medium",
                            )}
                          >
                            {name}
                          </p>
                          <ResponderBadge conversationId={c.id} />
                        </div>
                        {c.last_message_at && (
                          <span
                            className={cn(
                              "shrink-0 text-[11px]",
                              unread ? "font-medium text-primary" : "text-muted-foreground",
                            )}
                          >
                            {formatListTime(c.last_message_at)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <p
                          className={cn(
                            "truncate text-xs",
                            unread ? "text-foreground" : "text-muted-foreground",
                          )}
                        >
                          {c.last_message === "[Attachment]" ? "📎 Tệp đính kèm" : c.last_message}
                        </p>
                        {unread && (
                          <span className="flex h-4.5 min-w-4.5 shrink-0 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                            {c.unread_count}
                          </span>
                        )}
                      </div>
                      {handoff ? (
                        <p
                          className="mt-0.5 flex items-center gap-1 truncate pr-7 text-[11px] font-medium text-amber-700 dark:text-amber-400"
                          title={`AI chuyển lúc ${formatListTime(handoff.at)}`}
                        >
                          <Hand className="size-3 shrink-0" />
                          <span className="truncate">{handoff.reason}</span>
                        </p>
                      ) : (
                        <p className="mt-0.5 truncate pr-7 text-[11px] text-muted-foreground/80">
                          {/* Which Page / account it came in on. */}
                          {sourceOf(c)?.name ?? getPlatform(c.platform)?.label}
                        </p>
                      )}
                    </div>
                  </button>

                  {/* Per-conversation actions; a sibling of the row button (no nested buttons). */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Tuỳ chọn hội thoại"
                        className="absolute right-2 bottom-1.5 size-6 bg-background opacity-0 shadow-sm group-hover:opacity-100 data-[state=open]:opacity-100"
                      >
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {unread && (
                        <DropdownMenuItem onClick={() => props.onMarkRead(c)}>
                          <CheckCheck /> Đánh dấu đã đọc
                        </DropdownMenuItem>
                      )}
                      {handoff && (
                        <DropdownMenuItem onClick={() => resume(c.id)}>
                          <Bot /> Đã xử lý — trả lại cho bot
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => props.onToggleArchive(c)}>
                        {c.status === "archived" ? <ArchiveRestore /> : <Archive />}
                        {c.status === "archived" ? "Bỏ lưu trữ" : "Lưu trữ"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })}
            {props.hasMore && (
              <div className="p-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  disabled={props.loadingMore}
                  onClick={props.onLoadMore}
                >
                  {props.loadingMore && <Loader2 className="animate-spin" />}
                  Tải thêm hội thoại
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
}

import { Loader2, MessageSquare, Search } from "lucide-react";
import { useState } from "react";

import { AccountAvatar } from "@/shared/components/account-avatar";
import { PlatformIcon } from "@/shared/components/platform-icon";
import { Badge } from "@/shared/components/ui/badge";
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
import { Switch } from "@/shared/components/ui/switch";
import { getPlatform } from "@/shared/config/platforms";
import { cn } from "@/shared/lib/utils";

import { formatListTime } from "../../messages/lib/format";
import type { InboxSource } from "../../messages/lib/sources";
import { AutomationSettingsDialog } from "../automation/settings-dialog";
import { ALL_SOURCES } from "../constants";
import type { InboxPost } from "../types";

/** Post thumbnail; falls back to the platform's colour when there's none (or it expired). */
export function PostThumb({ post, className }: { post: InboxPost; className?: string }) {
  const [broken, setBroken] = useState(false);
  const color = getPlatform(post.platform)?.color ?? "#71717a";

  return (
    <div className={cn("relative shrink-0", className)}>
      {post.thumbnail && !broken ? (
        <img
          src={post.thumbnail}
          alt=""
          onError={() => setBroken(true)}
          className="size-full rounded-lg bg-muted object-cover"
        />
      ) : (
        <div
          className="flex size-full items-center justify-center rounded-lg opacity-90"
          style={{ background: `linear-gradient(135deg, ${color}33, ${color}aa)` }}
        >
          <MessageSquare className="size-1/3 text-white/80" />
        </div>
      )}
      <PlatformIcon
        platform={post.platform}
        size="sm"
        className="absolute -right-1 -bottom-1 size-4 rounded-[5px] ring-2 ring-background [&_svg]:size-2.5"
      />
    </div>
  );
}

interface PostListProps {
  posts: InboxPost[];
  loading: boolean;
  selectedId?: string;
  onSelect: (post: InboxPost) => void;
  sources: InboxSource[];
  sourceKey: string;
  onSourceChange: (key: string) => void;
  sourceOf: (p: InboxPost) => InboxSource | undefined;
  query: string;
  onQueryChange: (q: string) => void;
  withComments: boolean;
  onWithCommentsChange: (v: boolean) => void;
  /** Unanswered comments of a post, when its comments are loaded. */
  unanswered: (postId: string) => number | undefined;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
}

export function PostList(props: PostListProps) {
  const { posts, selectedId, onSelect, sources, sourceKey, onSourceChange, sourceOf, query } =
    props;

  return (
    <aside className="flex w-80 shrink-0 flex-col border-r bg-background xl:w-96">
      <div className="space-y-3 border-b p-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Bình luận</h2>
          <AutomationSettingsDialog />
        </div>

        <Select value={sourceKey} onValueChange={onSourceChange}>
          <SelectTrigger size="sm" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_SOURCES}>Tất cả Page / tài khoản</SelectItem>
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
            placeholder="Tìm trong bài viết đã tải…"
            value={query}
            onChange={(e) => props.onQueryChange(e.target.value)}
          />
        </div>

        <label className="flex items-center justify-between text-xs text-muted-foreground">
          Chỉ bài có bình luận
          <Switch
            size="sm"
            checked={props.withComments}
            onCheckedChange={props.onWithCommentsChange}
          />
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {props.loading ? (
          <div className="space-y-1 p-3">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <p className="px-6 py-16 text-center text-sm text-muted-foreground">
            Không có bài viết nào.
          </p>
        ) : (
          <>
            {posts.map((p) => {
              const unanswered = props.unanswered(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onSelect(p)}
                  className={cn(
                    "flex w-full gap-3 border-l-2 border-transparent px-3 py-3 text-left transition-colors hover:bg-muted/60",
                    selectedId === p.id && "border-primary bg-primary/5 hover:bg-primary/10",
                  )}
                >
                  <PostThumb post={p} className="size-12" />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm leading-snug">
                      {p.content || (
                        <span className="text-muted-foreground">(Không có nội dung)</span>
                      )}
                    </p>
                    <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                      <span className="truncate">
                        {sourceOf(p)?.name ?? getPlatform(p.platform)?.label}
                        {p.published_at && <> · {formatListTime(p.published_at)}</>}
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        {!!unanswered && (
                          <Badge className="h-4 rounded-full px-1.5 text-[10px] tabular-nums">
                            {unanswered} chưa TL
                          </Badge>
                        )}
                        <span className="flex items-center gap-1">
                          <MessageSquare className="size-3" />
                          {p.comment_count}
                        </span>
                      </span>
                    </div>
                  </div>
                </button>
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
                  Tải thêm bài viết
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
}

import { ExternalLink, Eye, Heart, MessageCircle, Pencil, RefreshCw, Repeat2 } from "lucide-react";
import { Link } from "react-router";
import { toast } from "sonner";

import { getErrorMessage } from "@/shared/api";
import { AccountAvatar } from "@/shared/components/account-avatar";
import { Button } from "@/shared/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";
import { getPlatform } from "@/shared/config/platforms";
import { openExternal } from "@/shared/platform/opener";
import { cn } from "@/shared/lib/utils";

import { useRefreshPostMetrics } from "../api/posts";
import type { Post, PostTarget } from "../api/types";
import { can, formatDateTime, postTime, TARGET_STATUS } from "../lib/status";
import type { TargetOption } from "../lib/targets";
import { MediaThumb } from "./media-thumb";
import { PostActions } from "./post-actions";
import { PostStatusBadge } from "./post-status";

function Metric({ icon: Icon, value }: { icon: typeof Heart; value?: number }) {
  if (value === undefined) return null;
  return (
    <span className="inline-flex items-center gap-1">
      <Icon className="size-3.5" /> {value.toLocaleString("vi-VN")}
    </span>
  );
}

function TargetRow({ target: t, option }: { target: PostTarget; option?: TargetOption }) {
  const status = TARGET_STATUS[t.status];
  return (
    <div className="space-y-2 rounded-lg border p-3">
      <div className="flex items-center gap-3">
        <AccountAvatar picture={option?.picture} platform={t.platform} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {option?.name ?? getPlatform(t.platform)?.label ?? t.platform}
          </p>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className={cn("size-1.5 rounded-full", status.dot)} />
            {status.label}
            {t.published_at && ` · ${formatDateTime(t.published_at)}`}
            {t.media_type && ` · ${t.media_type}`}
          </p>
        </div>
        {t.permalink && (
          <Button
            variant="ghost"
            size="icon-sm"
            title="Xem trên nền tảng"
            onClick={() => openExternal(t.permalink!)}
          >
            <ExternalLink />
          </Button>
        )}
      </div>

      {t.error && (
        <p className="rounded-md bg-destructive/10 px-2 py-1.5 text-xs text-destructive">
          {t.error.message}
          <span className="block font-mono opacity-70">{t.error.code}</span>
        </p>
      )}

      {t.metrics && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <Metric icon={Eye} value={t.metrics.views} />
          <Metric icon={Heart} value={t.metrics.likes} />
          <Metric icon={MessageCircle} value={t.metrics.comments} />
          <Metric icon={Repeat2} value={t.metrics.shares} />
        </div>
      )}
    </div>
  );
}

/** Right-side panel: full content, media and per-channel delivery results. */
export function PostDetailSheet({
  post: p,
  optionOf,
  onOpenChange,
}: {
  post: Post | undefined;
  optionOf: (t: PostTarget) => TargetOption | undefined;
  onOpenChange: (open: boolean) => void;
}) {
  const time = p && postTime(p);
  const refresh = useRefreshPostMetrics();
  return (
    <Sheet open={!!p} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 sm:max-w-md">
        {p && (
          <>
            <SheetHeader className="border-b">
              <div className="flex items-center gap-2 pr-8">
                <PostStatusBadge status={p.status} />
                {p.retry_count > 0 && (
                  <span className="text-xs text-muted-foreground">
                    Đã thử lại {p.retry_count} lần
                  </span>
                )}
              </div>
              <SheetTitle className="sr-only">Chi tiết bài viết</SheetTitle>
              <SheetDescription>
                {time!.label} {formatDateTime(time!.at)}
              </SheetDescription>
            </SheetHeader>

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
              {p.title && <p className="font-semibold">{p.title}</p>}
              <p className="text-sm whitespace-pre-wrap">
                {p.text || <span className="text-muted-foreground italic">Chưa có nội dung</span>}
              </p>

              {!!p.media?.length && (
                <div className="grid grid-cols-3 gap-2">
                  {p.media.map((m, i) => (
                    <MediaThumb key={i} media={m} className="aspect-square w-full" />
                  ))}
                </div>
              )}

              {p.first_comment && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Bình luận đầu tiên</p>
                  <p className="rounded-md bg-muted/60 px-2 py-1.5 text-sm">{p.first_comment}</p>
                </div>
              )}

              <section className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Kênh đăng ({p.targets?.length ?? 0})
                  </h4>
                  {p.targets?.some((t) => t.status === "published") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      disabled={refresh.isPending}
                      onClick={async () => {
                        try {
                          const res = await refresh.mutateAsync(p.id);
                          const failed = res.data.targets?.filter((t) => t.error).length ?? 0;
                          if (failed) toast.warning(`${failed} kênh không lấy được số liệu`);
                          else toast.success("Đã cập nhật số liệu từ nền tảng");
                        } catch (err) {
                          toast.error(getErrorMessage(err));
                        }
                      }}
                    >
                      <RefreshCw className={cn(refresh.isPending && "animate-spin")} /> Làm mới số
                      liệu
                    </Button>
                  )}
                </div>
                {p.targets?.map((t, i) => (
                  <TargetRow key={i} target={t} option={optionOf(t)} />
                ))}
              </section>
            </div>

            <div className="flex items-center justify-end gap-2 border-t p-4">
              {can.edit(p) && (
                <Button asChild variant="outline" size="sm">
                  <Link to={`/posts/${p.id}/edit`}>
                    <Pencil /> Sửa
                  </Link>
                </Button>
              )}
              <PostActions post={p} />
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

import { FileText, Loader2, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { toast } from "sonner";

import { useAccounts } from "@/features/connections";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { DataTable, type RowSelectionState } from "@/shared/components/data-table";
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
import { PLATFORMS } from "@/shared/config/platforms";
import { cn } from "@/shared/lib/utils";

import { useDeletePost, usePost, usePosts } from "../api/posts";
import type { PostStatus } from "../api/types";
import { getPostColumns } from "../components/post-columns";
import { PostDetailSheet } from "../components/post-detail-sheet";
import { can, POST_STATUS, STATUS_TABS } from "../lib/status";
import { useTargetOptions } from "../lib/targets";

const ALL = "all";
const POST_PARAM = "post";
const SEARCH_DEBOUNCE_MS = 350;

function PostsContent() {
  const accounts = useAccounts();
  const { optionOf } = useTargetOptions(accounts.data ?? []);
  const remove = useDeletePost();
  const [status, setStatus] = useState<PostStatus | typeof ALL>(ALL);
  const [platform, setPlatform] = useState(ALL);
  const [query, setQuery] = useState("");
  const [selection, setSelection] = useState<RowSelectionState>({});
  const [params, setParams] = useSearchParams();

  // Don't hit the API on every keystroke.
  const [search, setSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setSearch(query.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);

  const posts = usePosts({
    status: status === ALL ? undefined : status,
    platform: platform === ALL ? undefined : platform,
    search: search || undefined,
    sort: "created_desc",
  });
  const rows = useMemo(() => posts.posts ?? [], [posts.posts]);
  const columns = useMemo(() => getPostColumns({ optionOf }), [optionOf]);

  // Only act on selected rows that are still visible and deletable.
  const selected = rows.filter((p) => selection[p.id] && can.remove(p));

  const deleteSelected = async () => {
    const results = await Promise.allSettled(selected.map((p) => remove.mutateAsync(p.id)));
    const failed = results.filter((r) => r.status === "rejected").length;
    if (results.length - failed > 0) toast.success(`Đã xoá ${results.length - failed} bài viết`);
    if (failed > 0) toast.error(`${failed} bài xoá thất bại`);
    setSelection({});
  };

  const openId = params.get(POST_PARAM);
  // From the loaded list; otherwise (e.g. a link to an older post) fetched on its own.
  const inList = rows.find((p) => p.id === openId);
  const single = usePost(openId && !inList && !posts.isLoading ? openId : undefined);
  const open = inList ?? single.data;
  const setOpen = (id: string | null) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (id) next.set(POST_PARAM, id);
        else next.delete(POST_PARAM);
        return next;
      },
      { replace: true },
    );

  const filtering = status !== ALL || platform !== ALL || query.trim() !== "";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bài đăng"
        description="Tạo, lên lịch và đăng bài lên nhiều kênh cùng lúc."
        actions={
          <Button asChild size="sm">
            <Link to="/posts/new">
              <Plus /> Tạo bài viết
            </Link>
          </Button>
        }
      />

      {posts.error ? (
        <ErrorState error={posts.error} onRetry={() => posts.refetch()} />
      ) : !posts.isLoading && rows.length === 0 && !filtering ? (
        <EmptyState
          icon={FileText}
          title="Chưa có bài viết nào"
          description="Soạn bài một lần, đăng lên Facebook, Instagram, TikTok… cùng lúc."
          action={
            <Button asChild size="sm">
              <Link to="/posts/new">
                <Plus /> Tạo bài viết
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1 border-b">
            {STATUS_TABS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={cn(
                  "-mb-px flex items-center gap-1.5 border-b-2 border-transparent px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground",
                  status === s && "border-primary font-medium text-foreground",
                )}
              >
                {s === ALL ? "Tất cả" : POST_STATUS[s].label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-60 flex-1">
              <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Tìm trong nội dung bài…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger className="w-48">
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

            {selected.length > 0 && (
              <ConfirmDialog
                trigger={
                  <Button variant="destructive" size="sm" className="ml-auto">
                    <Trash2 /> Xoá ({selected.length})
                  </Button>
                }
                title={`Xoá ${selected.length} bài viết?`}
                description="Bài đã lên lịch sẽ bị huỷ; bài đã đăng cũng bị xoá trên các nền tảng."
                confirmLabel="Xoá"
                onConfirm={deleteSelected}
              />
            )}
          </div>

          <DataTable
            columns={columns}
            data={rows}
            getRowId={(p) => p.id}
            rowSelection={selection}
            onRowSelectionChange={setSelection}
            onRowClick={(p) => setOpen(p.id)}
            loading={posts.isLoading}
            empty="Không có bài phù hợp — thử đổi trạng thái, kênh hoặc từ khoá."
          />

          {posts.hasNextPage && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                size="sm"
                disabled={posts.isFetchingNextPage}
                onClick={() => posts.fetchNextPage()}
              >
                {posts.isFetchingNextPage && <Loader2 className="animate-spin" />}
                Tải thêm bài cũ hơn
              </Button>
            </div>
          )}
        </div>
      )}

      <PostDetailSheet post={open} optionOf={optionOf} onOpenChange={(o) => !o && setOpen(null)} />
    </div>
  );
}

/**
 * SocialAPI endpoints for this screen:
 *   GET /posts, POST /posts/{id}/publish|retry|unpublish, DELETE /posts/{id}
 */
export function PostsPage() {
  return (
    <RequireApiKey>
      <PostsContent />
    </RequireApiKey>
  );
}

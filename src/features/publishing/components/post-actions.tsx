import { EllipsisVertical, EyeOff, Pencil, RotateCcw, Send, Trash2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

import { getErrorMessage } from "@/shared/api";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";

import { useDeletePost, usePublishPost, useRetryPost, useUnpublishPost } from "../api/posts";
import type { Post } from "../api/types";
import { can } from "../lib/status";

type Confirm = "delete" | "unpublish" | null;

/** Kebab menu with every action the post's status allows. */
export function PostActions({ post: p }: { post: Post }) {
  const navigate = useNavigate();
  const publish = usePublishPost();
  const retry = useRetryPost();
  const unpublish = useUnpublishPost();
  const remove = useDeletePost();
  const [confirm, setConfirm] = useState<Confirm>(null);

  const run = async (action: () => Promise<unknown>, done: string) => {
    try {
      await action();
      toast.success(done);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Thao tác"
            onClick={(e) => e.stopPropagation()}
          >
            <EllipsisVertical />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          {can.edit(p) && (
            <DropdownMenuItem onSelect={() => navigate(`/posts/${p.id}/edit`)}>
              <Pencil /> Sửa
            </DropdownMenuItem>
          )}
          {can.publishNow(p) && (
            <DropdownMenuItem
              onSelect={() => run(() => publish.mutateAsync(p.id), "Đang đăng bài…")}
            >
              <Send /> Đăng ngay
            </DropdownMenuItem>
          )}
          {can.retry(p) && (
            <DropdownMenuItem
              onSelect={() => run(() => retry.mutateAsync(p.id), "Đang đăng lại các kênh lỗi…")}
            >
              <RotateCcw /> Thử lại kênh lỗi
            </DropdownMenuItem>
          )}
          {can.unpublish(p) && (
            <DropdownMenuItem onSelect={() => setConfirm("unpublish")}>
              <EyeOff /> Gỡ khỏi nền tảng
            </DropdownMenuItem>
          )}
          {can.remove(p) && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => setConfirm("delete")}>
                <Trash2 /> Xoá
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={confirm === "unpublish"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Gỡ bài khỏi các nền tảng?"
        description="Bài sẽ bị xoá trên các kênh đã đăng nhưng vẫn giữ lại trong app. Một số nền tảng (VD TikTok) không hỗ trợ gỡ."
        confirmLabel="Gỡ bài"
        onConfirm={() => run(() => unpublish.mutateAsync({ id: p.id }), "Đã gỡ bài")}
      />
      <ConfirmDialog
        open={confirm === "delete"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Xoá bài viết?"
        description={
          p.status === "scheduled"
            ? "Bài đã lên lịch sẽ bị huỷ (không hoàn credit)."
            : p.status === "published" || p.status === "partial"
              ? "Bài cũng sẽ bị xoá trên các nền tảng đã đăng."
              : "Không thể hoàn tác."
        }
        confirmLabel="Xoá"
        onConfirm={() => run(() => remove.mutateAsync(p.id), "Đã xoá bài viết")}
      />
    </>
  );
}

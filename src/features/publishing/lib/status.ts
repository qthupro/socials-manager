import type { Post, PostStatus, PostTargetStatus } from "../api/types";

export const POST_STATUS: Record<PostStatus, { label: string; className: string }> = {
  draft: { label: "Nháp", className: "bg-muted text-muted-foreground" },
  scheduled: { label: "Đã lên lịch", className: "bg-blue-500/15 text-blue-700 dark:text-blue-300" },
  publishing: {
    label: "Đang đăng",
    className: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  },
  published: {
    label: "Đã đăng",
    className: "bg-green-500/15 text-green-700 dark:text-green-300",
  },
  partial: {
    label: "Lỗi một phần",
    className: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
  },
  failed: { label: "Thất bại", className: "bg-destructive/15 text-destructive" },
  cancelled: { label: "Đã gỡ", className: "bg-muted text-muted-foreground line-through" },
};

export const TARGET_STATUS: Record<PostTargetStatus, { label: string; dot: string }> = {
  pending: { label: "Chờ đăng", dot: "bg-blue-500" },
  publishing: { label: "Đang đăng", dot: "bg-amber-500 animate-pulse" },
  published: { label: "Đã đăng", dot: "bg-green-500" },
  failed: { label: "Lỗi", dot: "bg-destructive" },
  cancelled: { label: "Đã huỷ", dot: "bg-muted-foreground" },
  unpublished: { label: "Đã gỡ", dot: "bg-muted-foreground" },
};

/** Status tabs on the list, in order. */
export const STATUS_TABS: (PostStatus | "all")[] = [
  "all",
  "draft",
  "scheduled",
  "publishing",
  "published",
  "partial",
  "failed",
];

/** What the API allows per status (guides/publishing + api-reference). */
export const can = {
  edit: (p: Post) => ["draft", "scheduled", "failed"].includes(p.status),
  publishNow: (p: Post) =>
    (p.status === "draft" || p.status === "scheduled") && !!p.targets?.length,
  retry: (p: Post) => p.status === "failed" || p.status === "partial",
  unpublish: (p: Post) => !!p.targets?.some((t) => t.status === "published"),
  remove: (p: Post) => p.status !== "publishing",
};

/** The time that matters for a post: published, else scheduled, else last edit. */
export function postTime(p: Post): { label: string; at: string } {
  if (p.published_at) return { label: "Đăng lúc", at: p.published_at };
  if (p.scheduled_at) return { label: "Lên lịch", at: p.scheduled_at };
  return { label: "Sửa lúc", at: p.updated_at };
}

const dateTime = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export const formatDateTime = (iso: string) => dateTime.format(new Date(iso));

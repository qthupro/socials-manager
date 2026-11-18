import type { ColumnDef } from "@/shared/components/data-table";
import { cn } from "@/shared/lib/utils";

import type { Post, PostTarget } from "../api/types";
import { formatInfo, formatOfPost } from "../lib/formats";
import { formatDateTime, postTime } from "../lib/status";
import type { TargetOption } from "../lib/targets";
import { MediaStackThumb } from "./media-thumb";
import { PostActions } from "./post-actions";
import { PostStatusBadge, PostTargets } from "./post-status";

/** Column set for the posts table. */
export function getPostColumns({
  optionOf,
}: {
  optionOf: (t: PostTarget) => TargetOption | undefined;
}): ColumnDef<Post>[] {
  return [
    {
      id: "content",
      header: "Nội dung",
      cell: ({ row: { original: p } }) => {
        const failed = p.targets?.filter((t) => t.error).length ?? 0;
        const format = formatOfPost(p);
        return (
          <div className="flex max-w-xl min-w-64 items-center gap-3">
            <MediaStackThumb media={p.media} />
            <div className="min-w-0 space-y-0.5">
              <p
                className={cn(
                  "line-clamp-2 text-sm whitespace-normal",
                  !p.text && "text-muted-foreground italic",
                )}
              >
                {format !== "post" && (
                  <span className="mr-1.5 rounded bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary">
                    {formatInfo(format).label}
                  </span>
                )}
                {p.title && <span className="font-medium">{p.title} · </span>}
                {p.text || "Chưa có nội dung"}
              </p>
              {failed > 0 && <p className="text-xs text-destructive">{failed} kênh lỗi</p>}
            </div>
          </div>
        );
      },
    },
    {
      id: "targets",
      header: "Kênh",
      cell: ({ row: { original: p } }) => (
        <PostTargets targets={p.targets ?? []} optionOf={optionOf} />
      ),
    },
    {
      id: "status",
      header: "Trạng thái",
      cell: ({ row: { original: p } }) => <PostStatusBadge status={p.status} />,
    },
    {
      id: "time",
      header: "Thời gian",
      cell: ({ row: { original: p } }) => {
        const t = postTime(p);
        return (
          <div className="text-sm whitespace-nowrap">
            <p className="tabular-nums">{formatDateTime(t.at)}</p>
            <p className="text-xs text-muted-foreground">{t.label}</p>
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row: { original: p } }) => (
        <div className="flex justify-end">
          <PostActions post={p} />
        </div>
      ),
    },
  ];
}

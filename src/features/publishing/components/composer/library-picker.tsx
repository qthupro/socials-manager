import { Film, Images, Loader2 } from "lucide-react";
import { useState } from "react";

import { AppDialog, AppDialogClose } from "@/shared/components/app-dialog";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { cn } from "@/shared/lib/utils";

import { isVideoType, toMediaInput, useMediaFiles, type MediaFile } from "../../api/media";
import type { MediaInput } from "../../api/types";

/** Pick files already in the SocialAPI media library (sent as media_id). */
export function LibraryPicker({
  max,
  accept,
  disabled,
  onPick,
}: {
  /** How many more items the post can take. */
  max: number;
  /** Same filter as the file picker ("video/*" for reels…). */
  accept: string;
  disabled?: boolean;
  onPick: (media: MediaInput[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const media = useMediaFiles();
  const videoOnly = !accept.includes("image");
  const files = (media.files ?? []).filter((f) => !videoOnly || isVideoType(f.content_type));

  const toggle = (f: MediaFile) =>
    setPicked((p) =>
      p.includes(f.id) ? p.filter((x) => x !== f.id) : p.length < max ? [...p, f.id] : p,
    );

  return (
    <AppDialog
      open={open}
      onOpenChange={(o) => {
        if (o) setPicked([]);
        setOpen(o);
      }}
      size="lg"
      trigger={
        <Button type="button" variant="outline" size="sm" disabled={disabled}>
          <Images /> Thư viện
        </Button>
      }
      title="Chọn từ thư viện media"
      description={`Chọn tối đa ${max} tệp, theo thứ tự bấm.`}
      footerNote={picked.length ? `Đã chọn ${picked.length}` : undefined}
      footer={
        <>
          <AppDialogClose asChild>
            <Button variant="outline" size="sm">
              Huỷ
            </Button>
          </AppDialogClose>
          <Button
            size="sm"
            disabled={!picked.length}
            onClick={() => {
              onPick(picked.map((id) => toMediaInput(files.find((f) => f.id === id)!)));
              setOpen(false);
            }}
          >
            Thêm {picked.length || ""}
          </Button>
        </>
      }
    >
      <div className="max-h-[60vh] space-y-3 overflow-y-auto">
        {media.isLoading ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="aspect-square rounded-md" />
            ))}
          </div>
        ) : files.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            {videoOnly ? "Thư viện chưa có video nào." : "Thư viện trống."}
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {files.map((f) => {
              const order = picked.indexOf(f.id);
              const video = isVideoType(f.content_type);
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => toggle(f)}
                  title={f.filename}
                  className={cn(
                    "relative aspect-square overflow-hidden rounded-md border bg-muted",
                    order >= 0 && "ring-2 ring-primary",
                  )}
                >
                  {video ? (
                    <video
                      src={f.url}
                      muted
                      preload="metadata"
                      className="size-full object-cover"
                    />
                  ) : (
                    <img src={f.url} alt="" loading="lazy" className="size-full object-cover" />
                  )}
                  {video && (
                    <Film className="absolute bottom-1 left-1 size-4 text-white drop-shadow" />
                  )}
                  {order >= 0 && (
                    <span className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-primary text-[11px] font-medium text-primary-foreground">
                      {order + 1}
                    </span>
                  )}
                  {order < 0 && picked.length >= max && (
                    <span className="absolute inset-0 bg-background/50" />
                  )}
                </button>
              );
            })}
          </div>
        )}
        {media.hasNextPage && (
          <div className="flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              disabled={media.isFetchingNextPage}
              onClick={() => media.fetchNextPage()}
            >
              {media.isFetchingNextPage && <Loader2 className="animate-spin" />} Tải thêm
            </Button>
          </div>
        )}
      </div>
    </AppDialog>
  );
}

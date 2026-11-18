import { Check, Film, HardDrive, Images, Loader2, Send, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

import { getErrorMessage } from "@/shared/api";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { PageHeader } from "@/shared/components/page-header";
import { EmptyState, ErrorState, RequireApiKey } from "@/shared/components/state-views";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { cn } from "@/shared/lib/utils";

import {
  formatBytes,
  isVideoType,
  MAX_UPLOAD_BYTES,
  toMediaInput,
  useDeleteMedia,
  useMediaFiles,
  useStorageUsage,
  useUploadMedia,
  type MediaFile,
} from "../api/media";
import { formatDateTime } from "../lib/status";

function StorageBar() {
  const storage = useStorageUsage();
  if (!storage.data) return <Skeleton className="h-14 rounded-xl" />;
  const { used_bytes, limit_bytes, count } = storage.data;
  const unlimited = limit_bytes < 0;
  const pct = unlimited ? 0 : Math.min(100, (used_bytes / Math.max(limit_bytes, 1)) * 100);
  return (
    <div className="flex items-center gap-4 rounded-xl border bg-card p-4">
      <HardDrive className="size-5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
          <span>
            <span className="font-medium">{formatBytes(used_bytes)}</span>
            <span className="text-muted-foreground">
              {unlimited ? " · không giới hạn" : ` / ${formatBytes(limit_bytes)}`}
            </span>
          </span>
          <span className="text-xs text-muted-foreground">{count} tệp</span>
        </div>
        {!unlimited && (
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full bg-primary transition-[width]",
                pct > 90 && "bg-destructive",
                pct > 75 && pct <= 90 && "bg-amber-500",
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function MediaCard({
  file: f,
  selected,
  onToggle,
}: {
  file: MediaFile;
  selected: boolean;
  onToggle: () => void;
}) {
  const [broken, setBroken] = useState(false);
  const video = isVideoType(f.content_type);
  return (
    <div className="group space-y-1.5">
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "relative block aspect-square w-full overflow-hidden rounded-lg border bg-muted ring-offset-2 ring-offset-background transition",
          selected && "ring-2 ring-primary",
        )}
      >
        {broken ? (
          <span className="flex size-full items-center justify-center text-muted-foreground">
            {video ? <Film className="size-8" /> : <Images className="size-8" />}
          </span>
        ) : video ? (
          <video
            src={f.url}
            muted
            preload="metadata"
            onError={() => setBroken(true)}
            className="size-full object-cover"
          />
        ) : (
          <img
            src={f.url}
            alt=""
            loading="lazy"
            onError={() => setBroken(true)}
            className="size-full object-cover"
          />
        )}
        {video && <Film className="absolute bottom-1.5 left-1.5 size-4 text-white drop-shadow" />}
        <span
          className={cn(
            "absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full border-2 border-white bg-black/30 opacity-0 transition-opacity group-hover:opacity-100",
            selected && "border-primary bg-primary opacity-100",
          )}
        >
          {selected && <Check className="size-3 text-primary-foreground" />}
        </span>
      </button>
      <div className="px-0.5">
        <p className="truncate text-xs font-medium" title={f.filename}>
          {f.filename}
        </p>
        <p className="text-[11px] text-muted-foreground">
          {formatBytes(f.size_bytes)} · {formatDateTime(f.created_at)}
        </p>
      </div>
    </div>
  );
}

function MediaContent() {
  const navigate = useNavigate();
  const media = useMediaFiles();
  const upload = useUploadMedia();
  const remove = useDeleteMedia();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);

  const files = media.files ?? [];
  const chosen = files.filter((f) => selected.includes(f.id));
  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const uploadFiles = async (list: File[]) => {
    const tooBig = list.filter((f) => f.size > MAX_UPLOAD_BYTES);
    if (tooBig.length) toast.error(`${tooBig.map((f) => f.name).join(", ")}: quá 50 MB`);
    const ok = list.filter((f) => f.size <= MAX_UPLOAD_BYTES);
    setUploading((n) => n + ok.length);
    let done = 0;
    for (const f of ok) {
      try {
        await upload.mutateAsync(f);
        done++;
      } catch (err) {
        toast.error(`${f.name}: ${getErrorMessage(err)}`);
      } finally {
        setUploading((n) => n - 1);
      }
    }
    if (done) toast.success(`Đã tải lên ${done} tệp`);
  };

  const deleteSelected = async () => {
    const results = await Promise.allSettled(chosen.map((f) => remove.mutateAsync(f.id)));
    const failed = results.filter((r) => r.status === "rejected").length;
    if (results.length - failed) toast.success(`Đã xoá ${results.length - failed} tệp`);
    if (failed) toast.error(`${failed} tệp xoá thất bại`);
    setSelected([]);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Thư viện media"
        description="Ảnh và video đã tải lên SocialAPI, dùng lại khi đăng bài."
        actions={
          <>
            <Button size="sm" disabled={uploading > 0} onClick={() => fileRef.current?.click()}>
              {uploading ? <Loader2 className="animate-spin" /> : <Upload />}
              {uploading ? `Đang tải ${uploading} tệp…` : "Tải lên"}
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/*"
              multiple
              hidden
              onChange={(e) => {
                const list = [...(e.target.files ?? [])];
                e.target.value = "";
                void uploadFiles(list);
              }}
            />
          </>
        }
      />

      <StorageBar />

      {chosen.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm">
          <span className="font-medium">Đã chọn {chosen.length}</span>
          <Button variant="ghost" size="sm" onClick={() => setSelected([])}>
            Bỏ chọn
          </Button>
          <div className="ml-auto flex gap-2">
            <Button
              size="sm"
              onClick={() => navigate("/posts/new", { state: { media: chosen.map(toMediaInput) } })}
            >
              <Send /> Tạo bài với {chosen.length} tệp
            </Button>
            <ConfirmDialog
              trigger={
                <Button size="sm" variant="destructive">
                  <Trash2 /> Xoá
                </Button>
              }
              title={`Xoá ${chosen.length} tệp?`}
              description="SocialAPI không kiểm tra tệp có đang được dùng hay không: bài đã lên lịch dùng tệp này sẽ đăng thất bại."
              confirmLabel="Xoá"
              onConfirm={deleteSelected}
            />
          </div>
        </div>
      )}

      {media.error ? (
        <ErrorState error={media.error} onRetry={() => media.refetch()} />
      ) : media.isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 12 }, (_, i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      ) : files.length === 0 ? (
        <EmptyState
          icon={Images}
          title="Thư viện trống"
          description="Tải ảnh / video lên một lần, dùng lại cho nhiều bài. Mỗi tệp tối đa 50 MB."
          action={
            <Button size="sm" onClick={() => fileRef.current?.click()}>
              <Upload /> Tải lên
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
            {files.map((f) => (
              <MediaCard
                key={f.id}
                file={f}
                selected={selected.includes(f.id)}
                onToggle={() => toggle(f.id)}
              />
            ))}
          </div>
          {media.hasNextPage && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                size="sm"
                disabled={media.isFetchingNextPage}
                onClick={() => media.fetchNextPage()}
              >
                {media.isFetchingNextPage && <Loader2 className="animate-spin" />}
                Tải thêm
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/**
 * SocialAPI endpoints for this screen:
 *   GET /media, POST /media/upload, DELETE /media/{id}, GET /media/storage
 */
export function MediaPage() {
  return (
    <RequireApiKey>
      <MediaContent />
    </RequireApiKey>
  );
}

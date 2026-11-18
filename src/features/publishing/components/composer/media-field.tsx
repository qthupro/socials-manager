import { ChevronLeft, ChevronRight, ImagePlus, Link2, Loader2, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { getErrorMessage } from "@/shared/api";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";

import { MAX_UPLOAD_BYTES, uploadMedia } from "../../api/media";
import type { MediaInput } from "../../api/types";
import { isVideoUrl } from "../../lib/media";
import { MediaThumb } from "../media-thumb";
import { LibraryPicker } from "./library-picker";

/** Upper bound for any platform (TikTok photo posts); per-channel limits are checked elsewhere. */
const MAX_ITEMS = 35;

/**
 * Ordered media list (order = carousel order). Add by public URL, or pick files: they're
 * uploaded to the SocialAPI library (POST /media/upload) and sent as media_id.
 * Reports `uploading` so the editor can wait before submitting.
 */
export function MediaField({
  value,
  onChange,
  onUploadingChange,
  accept = "image/*,video/*",
  hint,
  max = MAX_ITEMS,
}: {
  /** Most items this post type can carry (1 for video / reel / story). */
  max?: number;
  /** File picker filter (e.g. video only for Reels). */
  accept?: string;
  /** What this post type expects, shown under the field. */
  hint?: string;
  value: MediaInput[];
  /** Takes an updater too: uploads finish later and must append to the latest list. */
  onChange: (update: MediaInput[] | ((prev: MediaInput[]) => MediaInput[])) => void;
  onUploadingChange?: (uploading: boolean) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState("");
  const [uploading, setUploading] = useState(0);
  const full = value.length + uploading >= max;

  const add = (items: MediaInput[]) => onChange((prev) => [...prev, ...items].slice(0, max));

  const addUrl = () => {
    const u = url.trim();
    if (!/^https?:\/\//i.test(u)) {
      toast.error("Cần link công khai bắt đầu bằng http(s)://");
      return;
    }
    add([{ source: u, source_type: "url", type: isVideoUrl(u) ? "video" : "image" }]);
    setUrl("");
  };

  const addFiles = async (files: File[]) => {
    const room = max - value.length - uploading;
    const picked = files.slice(0, Math.max(room, 0));
    const tooBig = picked.filter((f) => f.size > MAX_UPLOAD_BYTES);
    if (tooBig.length) toast.error(`${tooBig.map((f) => f.name).join(", ")}: quá 50 MB`);
    const ok = picked.filter((f) => f.size <= MAX_UPLOAD_BYTES);
    if (!ok.length) return;

    setUploading((n) => n + ok.length);
    onUploadingChange?.(true);
    // One at a time keeps the carousel order the user picked.
    for (const f of ok) {
      try {
        add([await uploadMedia(f)]);
      } catch (err) {
        toast.error(`${f.name}: ${getErrorMessage(err)}`);
      } finally {
        setUploading((n) => {
          if (n - 1 === 0) onUploadingChange?.(false);
          return n - 1;
        });
      }
    }
  };

  const move = (i: number, by: number) => {
    const next = [...value];
    [next[i], next[i + by]] = [next[i + by], next[i]];
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {(value.length > 0 || uploading > 0) && (
        <div className="flex flex-wrap gap-2">
          {value.map((m, i) => (
            <div key={`${m.source}-${i}`} className="group relative">
              <MediaThumb media={m} className="size-24" />
              <span className="absolute top-1 left-1 rounded bg-black/60 px-1 text-[10px] text-white">
                {i + 1}
              </span>
              <button
                type="button"
                aria-label="Bỏ"
                onClick={() => onChange(value.filter((_, j) => j !== i))}
                className="absolute top-1 right-1 rounded-full bg-black/60 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                <X className="size-3" />
              </button>
              <div className="absolute inset-x-1 bottom-1 flex justify-between opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  type="button"
                  aria-label="Lên trước"
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                  className="rounded bg-black/60 text-white disabled:invisible"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label="Ra sau"
                  disabled={i === value.length - 1}
                  onClick={() => move(i, 1)}
                  className="rounded bg-black/60 text-white disabled:invisible"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          ))}
          {Array.from({ length: uploading }, (_, i) => (
            <div
              key={`uploading-${i}`}
              className="flex size-24 items-center justify-center rounded-md bg-muted text-muted-foreground"
              title="Đang tải lên…"
            >
              <Loader2 className="size-5 animate-spin" />
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={full}
          onClick={() => fileRef.current?.click()}
        >
          <ImagePlus /> Chọn ảnh / video
        </Button>
        <LibraryPicker
          max={Math.max(max - value.length - uploading, 0)}
          accept={accept}
          disabled={full}
          onPick={add}
        />
        <input
          ref={fileRef}
          type="file"
          accept={accept}
          multiple
          hidden
          onChange={(e) => {
            // Copy first: resetting the input empties its FileList.
            const files = [...(e.target.files ?? [])];
            e.target.value = "";
            void addFiles(files);
          }}
        />
        <div className="relative min-w-56 flex-1">
          <Link2 className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-8 pl-8 text-sm"
            placeholder="Hoặc dán link ảnh / video công khai rồi Enter"
            value={url}
            disabled={full}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addUrl();
              }
            }}
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        {hint ?? `Tối đa ${MAX_ITEMS} mục.`} Mỗi tệp ≤ 50 MB · rê chuột để đổi thứ tự.
      </p>
    </div>
  );
}

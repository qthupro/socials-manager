import { FileImage, Film } from "lucide-react";
import { useState } from "react";

import { cn } from "@/shared/lib/utils";

import { useMediaPreview } from "../api/media";
import type { MediaInput } from "../api/types";
import { isVideo } from "../lib/media";

/**
 * One media item: URL, library item (media_id, previewed via GET /media) or a file
 * uploaded in this session. Falls back to an icon when there's nothing to show.
 */
export function MediaThumb({ media, className }: { media: MediaInput; className?: string }) {
  const [broken, setBroken] = useState(false);
  const src = useMediaPreview(media);
  const video = isVideo(media);
  const show = !!src && !broken;

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted text-muted-foreground",
        className,
      )}
    >
      {show && video ? (
        <>
          <video src={src} muted preload="metadata" className="size-full object-cover" />
          <Film className="absolute right-1 bottom-1 size-4 text-white drop-shadow" />
        </>
      ) : show ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          onError={() => setBroken(true)}
          className="size-full object-cover"
        />
      ) : video ? (
        <Film className="size-1/3" />
      ) : (
        <FileImage className="size-1/3" />
      )}
    </div>
  );
}

/** First item + "+N" badge, for list rows. */
export function MediaStackThumb({ media }: { media?: MediaInput[] }) {
  if (!media?.length) return null;
  return (
    <div className="relative">
      <MediaThumb media={media[0]} className="size-14" />
      {media.length > 1 && (
        <span className="absolute right-1 bottom-1 rounded bg-black/60 px-1 text-[10px] font-medium text-white">
          +{media.length - 1}
        </span>
      )}
    </div>
  );
}

import { Download, FileText, ImageOff, Loader2 } from "lucide-react";

import { cn } from "@/shared/lib/utils";
import { openExternal } from "@/shared/platform/opener";

import { useAttachmentUrl } from "../api/media";

const IMAGE_TYPES = new Set(["image", "photo", "sticker", "gif", "story_mention"]);
const VIDEO_TYPES = new Set(["video"]);
const AUDIO_TYPES = new Set(["audio", "voice"]);

/** Renders one message attachment by its (platform-specific) attachment_type. */
export function MessageAttachment({
  type,
  url,
  outgoing,
}: {
  type: string;
  url: string | null;
  outgoing: boolean;
}) {
  const { src, loading, error } = useAttachmentUrl(url);
  const kind = type.toLowerCase();

  if (loading) {
    return (
      <div className="flex h-32 w-48 items-center justify-center rounded-xl bg-muted">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!src || error) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">
        <ImageOff className="size-4" /> Tệp không còn khả dụng
      </div>
    );
  }

  if (IMAGE_TYPES.has(kind)) {
    return (
      <img
        src={src}
        alt=""
        className={cn(
          "max-h-72 max-w-64 cursor-zoom-in rounded-xl bg-muted object-cover",
          kind === "sticker" && "max-h-32 bg-transparent",
        )}
        onClick={() => url && !url.startsWith("blob:") && openExternal(url)}
      />
    );
  }
  if (VIDEO_TYPES.has(kind)) {
    return <video src={src} controls className="max-h-72 max-w-72 rounded-xl bg-black" />;
  }
  if (AUDIO_TYPES.has(kind)) {
    return <audio src={src} controls className="w-64" />;
  }

  return (
    <a
      href={src}
      download
      target="_blank"
      rel="noreferrer"
      className={cn(
        "flex items-center gap-2 rounded-xl px-3 py-2 text-sm",
        outgoing ? "bg-primary/90 text-primary-foreground" : "bg-muted",
      )}
    >
      <FileText className="size-5 shrink-0" />
      <span className="truncate">Tệp đính kèm ({type})</span>
      <Download className="size-4 shrink-0" />
    </a>
  );
}

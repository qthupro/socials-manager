import { Bookmark, Heart, MessageCircle, Send, Share2, ThumbsUp } from "lucide-react";
import { useState } from "react";

import { AccountAvatar } from "@/shared/components/account-avatar";
import { PlatformIcon } from "@/shared/components/platform-icon";
import { getPlatform, type PlatformSlug } from "@/shared/config/platforms";
import { cn } from "@/shared/lib/utils";

import type { MediaInput } from "../../api/types";
import type { PostFormat } from "../../lib/formats";
import type { TargetOption } from "../../lib/targets";
import { MediaThumb } from "../media-thumb";

/** Platforms whose feed shows the media first and the text as a caption. */
const MEDIA_FIRST: PlatformSlug[] = ["instagram", "tiktok", "youtube", "pinterest"];
const CLAMP_CHARS = 280;

function MediaGrid({ media }: { media: MediaInput[] }) {
  if (media.length === 0) return null;
  if (media.length === 1)
    return <MediaThumb media={media[0]} className="aspect-square w-full rounded-none" />;
  const shown = media.slice(0, 4);
  return (
    <div className="grid grid-cols-2 gap-0.5">
      {shown.map((m, i) => (
        <div key={i} className="relative">
          <MediaThumb media={m} className="aspect-square w-full rounded-none" />
          {i === 3 && media.length > 4 && (
            <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-xl font-semibold text-white">
              +{media.length - 4}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function Caption({ text, name }: { text: string; name?: string }) {
  const [more, setMore] = useState(false);
  const long = text.length > CLAMP_CHARS;
  return (
    <p className="text-sm break-words whitespace-pre-wrap">
      {name && <span className="mr-1 font-semibold">{name}</span>}
      {long && !more ? text.slice(0, CLAMP_CHARS) + "… " : text}
      {long && (
        <button
          type="button"
          onClick={() => setMore(!more)}
          className="text-muted-foreground hover:underline"
        >
          {more ? " Thu gọn" : "Xem thêm"}
        </button>
      )}
    </p>
  );
}

/**
 * Approximate look of the post per platform — not pixel-exact, just enough to spot
 * a cut-off caption, wrong media order or missing title before posting.
 */
export function PostPreview({
  format,
  platforms,
  accountFor,
  textFor,
  title,
  media,
}: {
  format: PostFormat;
  platforms: string[];
  /** First selected account on that platform (name + picture for the header). */
  accountFor: (platform: string) => TargetOption | undefined;
  textFor: (platform: string) => string;
  title: string;
  media: MediaInput[];
}) {
  const [active, setActive] = useState<string>();
  const current = platforms.includes(active ?? "") ? active! : platforms[0];

  if (!current) {
    return (
      <div className="rounded-xl border border-dashed px-4 py-12 text-center text-sm text-muted-foreground">
        Chọn kênh đăng để xem trước bài viết.
      </div>
    );
  }

  const slug = getPlatform(current)?.slug;
  const account = accountFor(current);
  const name = account?.name ?? getPlatform(current)?.label ?? current;
  const text = textFor(current);
  const mediaFirst = !!slug && MEDIA_FIRST.includes(slug);

  return (
    <div className="space-y-3">
      {platforms.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {platforms.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setActive(p)}
              title={getPlatform(p)?.label}
              className={cn(
                "rounded-lg p-0.5 ring-2 ring-transparent transition",
                p === current ? "ring-primary" : "opacity-60 hover:opacity-100",
              )}
            >
              <PlatformIcon platform={p} />
            </button>
          ))}
        </div>
      )}

      {format === "reel" || format === "story" ? (
        <VerticalPreview
          media={media[0]}
          name={name}
          picture={account?.picture}
          platform={current}
          caption={format === "reel" ? (slug === "youtube" ? title || text : text) : ""}
          story={format === "story"}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="flex items-center gap-2.5 p-3">
            <AccountAvatar picture={account?.picture} platform={current} size="md" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{name}</p>
              <p className="text-xs text-muted-foreground">Vừa xong · Công khai</p>
            </div>
          </div>

          {mediaFirst ? (
            <>
              {media.length > 0 ? (
                <MediaGrid media={media} />
              ) : (
                <div className="flex aspect-square items-center justify-center bg-muted text-xs text-muted-foreground">
                  {getPlatform(current)?.label} cần ảnh hoặc video
                </div>
              )}
              <div className="space-y-1.5 p-3">
                <div className="flex gap-3 text-foreground/80">
                  <Heart className="size-5" />
                  <MessageCircle className="size-5" />
                  <Send className="size-5" />
                  <Bookmark className="ml-auto size-5" />
                </div>
                {slug === "youtube" && (
                  <p className={cn("text-sm font-semibold", !title && "text-destructive")}>
                    {title || "Thiếu tiêu đề video"}
                  </p>
                )}
                {text && <Caption text={text} name={slug === "youtube" ? undefined : name} />}
              </div>
            </>
          ) : (
            <>
              {(text || title) && (
                <div className="space-y-1 px-3 pb-3">
                  {title && <p className="text-sm font-semibold">{title}</p>}
                  {text && <Caption text={text} />}
                </div>
              )}
              <MediaGrid media={media} />
              <div className="flex justify-around border-t py-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <ThumbsUp className="size-4" /> Thích
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MessageCircle className="size-4" /> Bình luận
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Share2 className="size-4" /> Chia sẻ
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** 9:16 frame for Reels / Shorts / Stories: media full-bleed, name and caption on top. */
function VerticalPreview({
  media,
  name,
  picture,
  platform,
  caption,
  story,
}: {
  media?: MediaInput;
  name: string;
  picture?: string;
  platform: string;
  caption: string;
  story: boolean;
}) {
  return (
    <div className="relative mx-auto aspect-[9/16] w-full max-w-60 overflow-hidden rounded-2xl bg-black shadow-sm">
      {media ? (
        <MediaThumb media={media} className="size-full rounded-none" />
      ) : (
        <div className="flex size-full items-center justify-center text-xs text-white/60">
          {story ? "Chưa có ảnh / video" : "Chưa có video"}
        </div>
      )}
      {story && <div className="absolute inset-x-2 top-2 h-0.5 rounded bg-white/70" />}
      <div className="absolute inset-x-3 top-4 flex items-center gap-2 text-white">
        <AccountAvatar picture={picture} platform={platform} size="sm" />
        <span className="truncate text-xs font-semibold drop-shadow">{name}</span>
      </div>
      {caption && (
        <p className="absolute inset-x-3 bottom-3 line-clamp-3 text-xs text-white drop-shadow">
          {caption}
        </p>
      )}
    </div>
  );
}

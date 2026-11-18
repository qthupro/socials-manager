/**
 * Post types and what each platform accepts for them — from the SocialAPI per-platform
 * publishing pages (docs.social-api.ai/platforms/<platform>/publishing). The composer
 * asks for the type first, greys out channels that can't take it, checks the media per
 * channel and fills the platform_data each platform needs (Instagram content_type, …).
 */
import { Clapperboard, FileText, RectangleVertical, Video, type LucideIcon } from "lucide-react";

import { getPlatform, type PlatformSlug } from "@/shared/config/platforms";

import type { MediaInput } from "../api/types";
import { isVideo } from "./media";

export type PostFormat = "post" | "video" | "reel" | "story";

export interface FormatInfo {
  value: PostFormat;
  label: string;
  description: string;
  icon: LucideIcon;
  /** File picker filter. */
  accept: string;
  /** Hint under the media field. */
  mediaHint: string;
  /** Stories carry no caption. */
  caption: boolean;
}

export const FORMATS: FormatInfo[] = [
  {
    value: "post",
    label: "Bài viết",
    description: "Chữ, ảnh hoặc album ảnh",
    icon: FileText,
    accept: "image/*,video/*",
    mediaHint: "Không ảnh = bài chữ · 1 ảnh = bài ảnh · từ 2 mục = album / carousel.",
    caption: true,
  },
  {
    value: "video",
    label: "Video",
    description: "1 video thường (ngang hoặc dọc)",
    icon: Video,
    accept: "video/*",
    mediaHint: "Đúng 1 video.",
    caption: true,
  },
  {
    value: "reel",
    label: "Reel / Short",
    description: "Video dọc ngắn 9:16",
    icon: Clapperboard,
    accept: "video/*",
    mediaHint: "Đúng 1 video dọc 9:16, nên 3–90 giây (TikTok / YouTube Short có thể dài hơn).",
    caption: true,
  },
  {
    value: "story",
    label: "Story",
    description: "1 ảnh hoặc video, tự ẩn sau 24h",
    icon: RectangleVertical,
    accept: "image/*,video/*",
    mediaHint: "Đúng 1 ảnh hoặc 1 video dọc · Story không có chữ / caption.",
    caption: false,
  },
];

export const formatInfo = (f: PostFormat) => FORMATS.find((x) => x.value === f)!;

interface Ctx {
  text: string;
  title: string;
  media: MediaInput[];
}

/** What a platform accepts for one post type. */
interface Rule {
  /** Text-only post allowed (no media). */
  textOnly?: boolean;
  /** Max images; 0 = none. */
  maxImages?: number;
  /** Video allowed (always exactly one, alone). */
  video?: boolean;
  /** Exactly one video required. */
  videoOnly?: boolean;
  /** Images and videos together (carousel). */
  mix?: boolean;
  /** Single item only (stories). */
  single?: boolean;
  /** Media is dropped by the platform. */
  ignoresMedia?: boolean;
  title?: "required" | "optional";
  textLimit?: number;
  textRequired?: boolean;
  firstComment?: boolean;
  /** platform_data for the target (flat keys) + text override. */
  build?: (ctx: Ctx) => { platform_data?: Record<string, unknown>; text?: string };
  /** Extra checks: [errors, warnings]. */
  check?: (ctx: Ctx) => [string[], string[]];
}

interface PlatformCaps {
  /** Why the platform can't be posted to from here at all. */
  unavailable?: string;
  formats: Partial<Record<PostFormat, Rule>>;
}

const CAPS: Partial<Record<PlatformSlug, PlatformCaps>> = {
  facebook: {
    formats: {
      post: { textOnly: true, maxImages: 10, textLimit: 63_206, firstComment: true },
      video: { videoOnly: true, textOnly: false, textLimit: 63_206, firstComment: true },
      reel: {
        videoOnly: true,
        textLimit: 63_206,
        firstComment: true,
        build: () => ({ platform_data: { content_type: "reel" } }),
      },
      story: {
        single: true,
        maxImages: 1,
        video: true,
        build: () => ({ platform_data: { content_type: "stories" } }),
      },
    },
  },
  instagram: {
    formats: {
      post: {
        maxImages: 10,
        mix: true,
        textLimit: 2_200,
        firstComment: true,
        build: ({ media }) => ({
          platform_data: { content_type: media.length >= 2 ? "carousel" : "feed" },
        }),
        check: ({ media }) =>
          media.length === 1 && isVideo(media[0])
            ? [["1 video trên Instagram là Reel — chọn loại “Reel / Short”."], []]
            : [[], []],
      },
      reel: {
        videoOnly: true,
        textLimit: 2_200,
        firstComment: true,
        build: () => ({ platform_data: { content_type: "reel" } }),
      },
      story: {
        single: true,
        maxImages: 1,
        video: true,
        build: () => ({ platform_data: { content_type: "stories" } }),
        check: () => [[], ["Ảnh Story Instagram phải là JPEG; video 3–60 giây."]],
      },
    },
  },
  threads: {
    formats: {
      post: { textOnly: true, maxImages: 20, mix: true, video: true, textLimit: 500 },
      video: { videoOnly: true, textOnly: false, textLimit: 500 },
    },
  },
  tiktok: {
    formats: {
      // Photo post: `text` is the title (90), the caption goes in description (4,000).
      post: {
        maxImages: 35,
        textLimit: 4_000,
        build: ({ text }) => ({
          platform_data: {
            media_type: "photo",
            privacy_level: "PUBLIC_TO_EVERYONE",
            description: text,
          },
          text: text.split("\n")[0].slice(0, 90),
        }),
        check: () => [[], ["Ảnh TikTok phải là JPEG hoặc WebP (không nhận PNG)."]],
      },
      reel: {
        videoOnly: true,
        textLimit: 2_200,
        build: () => ({ platform_data: { media_type: "video" } }),
      },
    },
  },
  youtube: {
    formats: {
      video: {
        videoOnly: true,
        title: "required",
        textRequired: true,
        textLimit: 5_000,
        firstComment: true,
      },
      reel: {
        videoOnly: true,
        title: "required",
        textRequired: true,
        textLimit: 5_000,
        firstComment: true,
      },
    },
  },
  linkedin: {
    formats: {
      post: { textOnly: true, maxImages: 20, textLimit: 3_000 },
      video: { videoOnly: true, textLimit: 3_000 },
    },
  },
  twitter: {
    formats: {
      post: { textOnly: true, maxImages: 4, textLimit: 280 },
      video: { videoOnly: true, textLimit: 280 },
    },
  },
  bluesky: {
    formats: { post: { textOnly: true, maxImages: 4, textLimit: 300 } },
  },
  google: {
    formats: { post: { textOnly: true, maxImages: 1, textLimit: 1_500, textRequired: true } },
  },
  zalo: {
    formats: {
      post: {
        textOnly: true,
        ignoresMedia: true,
        title: "optional",
        check: ({ text, title }) =>
          !title.trim() && text.length > 150
            ? [["Zalo: bài dài hơn 150 ký tự cần tiêu đề riêng."], []]
            : [[], []],
      },
    },
  },
  pinterest: {
    unavailable: "Pinterest cần chọn board — chưa hỗ trợ trong app",
    formats: {},
  },
};

export const slugOf = (platform: string) => getPlatform(platform)?.slug;
export const platformLabel = (platform: string) => getPlatform(platform)?.label ?? platform;

const ruleOf = (platform: string, format: PostFormat) => {
  const slug = slugOf(platform);
  return slug ? CAPS[slug]?.formats[format] : undefined;
};

/** null when the platform can take this post type, otherwise why not. */
export function unsupportedReason(platform: string, format: PostFormat): string | null {
  const slug = slugOf(platform);
  const caps = slug ? CAPS[slug] : undefined;
  if (!caps) return "Không đăng bài được lên kênh này";
  if (caps.unavailable) return caps.unavailable;
  return caps.formats[format] ? null : `Không hỗ trợ ${formatInfo(format).label}`;
}

/** Platforms (labels) that support a post type — shown on the type cards. */
export const platformsFor = (format: PostFormat) =>
  (Object.keys(CAPS) as PlatformSlug[]).filter(
    (s) => !CAPS[s]!.unavailable && CAPS[s]!.formats[format],
  );

export const textLimitFor = (platform: string, format: PostFormat) =>
  ruleOf(platform, format)?.textLimit;

export const titleFor = (platform: string, format: PostFormat) => ruleOf(platform, format)?.title;

export const firstCommentFor = (platform: string, format: PostFormat) =>
  !!ruleOf(platform, format)?.firstComment;

/** Errors block posting; warnings are shown but allowed. */
export function checkTarget(
  platform: string,
  format: PostFormat,
  ctx: Ctx,
): { errors: string[]; warnings: string[] } {
  const rule = ruleOf(platform, format);
  if (!rule) return { errors: [unsupportedReason(platform, format) ?? ""], warnings: [] };
  const errors: string[] = [];
  const warnings: string[] = [];
  const videos = ctx.media.filter(isVideo).length;
  const images = ctx.media.length - videos;
  const info = formatInfo(format);

  if (rule.ignoresMedia) {
    if (ctx.media.length) warnings.push("Không đăng ảnh / video — chỉ đăng chữ.");
  } else if (rule.videoOnly) {
    if (videos !== 1 || images > 0) errors.push("Cần đúng 1 video.");
  } else if (rule.single) {
    if (ctx.media.length !== 1) errors.push(`${info.label} cần đúng 1 ảnh hoặc 1 video.`);
  } else {
    if (!ctx.media.length && !rule.textOnly) errors.push("Cần ít nhất 1 ảnh hoặc video.");
    if (videos && !rule.video && !rule.mix) errors.push("Không nhận video ở loại bài này.");
    if (videos && images && !rule.mix) errors.push("Không trộn ảnh và video.");
    if (videos > 1 && !rule.mix) errors.push("Chỉ 1 video mỗi bài.");
    const max = rule.maxImages ?? 0;
    if (ctx.media.length > Math.max(max, 1) && (rule.mix || !videos)) {
      errors.push(max ? `Tối đa ${max} mục.` : "Không nhận ảnh.");
    }
  }

  if (info.caption) {
    const len = ctx.text.length;
    if (rule.textRequired && !ctx.text.trim()) errors.push("Cần nội dung / mô tả.");
    if (rule.textOnly && !ctx.media.length && !ctx.text.trim() && !rule.ignoresMedia)
      errors.push("Bài chữ cần nội dung.");
    if (rule.ignoresMedia && !ctx.text.trim() && !ctx.title.trim()) errors.push("Cần nội dung.");
    if (rule.textLimit && len > rule.textLimit)
      errors.push(
        `Dài ${len.toLocaleString("vi-VN")}/${rule.textLimit.toLocaleString("vi-VN")} ký tự.`,
      );
  }
  if (rule.title === "required" && !ctx.title.trim()) errors.push("Cần tiêu đề.");

  const [e, w] = rule.check?.(ctx) ?? [[], []];
  return { errors: [...errors, ...e], warnings: [...warnings, ...w] };
}

/** platform_data + text override for a target of this platform. */
export const buildTarget = (platform: string, format: PostFormat, ctx: Ctx) =>
  ruleOf(platform, format)?.build?.(ctx) ?? {};

/** Best guess of an existing post's type, from its targets (media_type / platform_data). */
export function formatOfPost(p: {
  media?: MediaInput[];
  targets?: { media_type?: string; platform_data?: Record<string, unknown> }[];
}): PostFormat {
  const kinds = (p.targets ?? []).map((t) =>
    String(t.media_type ?? t.platform_data?.content_type ?? "").toLowerCase(),
  );
  if (kinds.some((k) => k.startsWith("stor"))) return "story";
  if (kinds.some((k) => k.startsWith("reel"))) return "reel";
  if (p.media?.length === 1 && isVideo(p.media[0])) return "video";
  return "post";
}

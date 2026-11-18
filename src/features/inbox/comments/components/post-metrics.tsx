import {
  Bookmark,
  Clock,
  Eye,
  Heart,
  MessageSquare,
  Radio,
  Repeat2,
  Share2,
  Sparkles,
} from "lucide-react";
import type { ReactNode } from "react";

import { getPlatform, type PlatformSlug } from "@/shared/config/platforms";

import { usePostMetrics } from "../api/queries";
import type { InboxPost, PostMetrics as Metrics } from "../types";

type Key = keyof Metrics;

const LABELS: Record<Key, { label: string; icon: ReactNode }> = {
  views: { label: "Lượt xem", icon: <Eye /> },
  reach: { label: "Tiếp cận", icon: <Radio /> },
  likes: { label: "Thích", icon: <Heart /> },
  comments: { label: "Bình luận", icon: <MessageSquare /> },
  shares: { label: "Chia sẻ", icon: <Share2 /> },
  reposts: { label: "Đăng lại", icon: <Repeat2 /> },
  saves: { label: "Lưu", icon: <Bookmark /> },
  interactions: { label: "Tương tác", icon: <Sparkles /> },
  follows: { label: "Theo dõi mới", icon: <Heart /> },
  profile_visits: { label: "Xem trang cá nhân", icon: <Eye /> },
  avg_watch_time_ms: { label: "Xem TB", icon: <Clock /> },
};

/**
 * What each platform really reports (docs: guides/analytics). Elsewhere a missing figure
 * comes back as 0, so only these are shown. Instagram omits missing ones instead.
 */
const REPORTED: Partial<Record<PlatformSlug, Key[]>> = {
  facebook: ["likes", "comments", "shares"],
  threads: ["likes", "comments"],
  tiktok: ["views", "likes", "comments", "shares"],
  youtube: ["views", "likes", "comments"],
  twitter: ["likes", "comments"],
  bluesky: ["likes", "comments", "shares"],
};

const INSTAGRAM_ORDER: Key[] = [
  "views",
  "reach",
  "likes",
  "comments",
  "shares",
  "saves",
  "interactions",
  "follows",
  "profile_visits",
  "avg_watch_time_ms",
];

const compact = new Intl.NumberFormat("vi-VN", { notation: "compact", maximumFractionDigits: 1 });

function format(key: Key, value: number) {
  if (key === "avg_watch_time_ms") return `${(value / 1000).toFixed(1)}s`;
  return compact.format(value);
}

/** Live metrics of the post, when SocialAPI has it (imported by account sync). */
export function PostMetricsBar({ post }: { post: InboxPost }) {
  const metrics = usePostMetrics(post);
  const slug = getPlatform(post.platform)?.slug;
  const target = metrics.data?.find((t) => t.metrics && !t.error) ?? metrics.data?.[0];
  const m = target && !target.error ? target.metrics : undefined;

  // Not imported (404), unsupported (LinkedIn / Pinterest) or still loading: show nothing.
  if (!m || !slug) return null;

  const keys =
    slug === "instagram"
      ? INSTAGRAM_ORDER.filter((k) => m[k] !== undefined)
      : (REPORTED[slug] ?? []).filter((k) => m[k] !== undefined);
  if (keys.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1">
      {keys.map((k) => (
        <span
          key={k}
          title={LABELS[k].label}
          className="flex items-center gap-1 text-xs text-muted-foreground [&_svg]:size-3.5"
        >
          {LABELS[k].icon}
          <span className="font-medium text-foreground tabular-nums">{format(k, m[k]!)}</span>
          <span className="hidden xl:inline">{LABELS[k].label.toLowerCase()}</span>
        </span>
      ))}
    </div>
  );
}

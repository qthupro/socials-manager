/**
 * SocialAPI comment inbox schemas (docs: guides/comments, api-reference/inbox-comments).
 * Mock data uses these exact shapes so the API can be swapped in later.
 */

/** InboxPost — GET /inbox/comments (posts with their comment counts). */
export interface InboxPost {
  /** The platform's post ID; the {post_id} in paths. */
  id: string;
  account_id: string;
  /** Facebook only (sapi_page_…). */
  page_id?: string;
  platform: string;
  /** Caption / text. */
  content: string | null;
  /** May be a temporary link (TikTok) or null (LinkedIn, Bluesky). */
  thumbnail: string | null;
  permalink: string | null;
  comment_count: number;
  like_count: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CommentPage<T> {
  data: T[] | null;
  pagination: { has_more: boolean; next_cursor?: string };
}

/**
 * Live per-post metrics (GET /posts/{post_id}/metrics — accepts the platform post id).
 * Which fields are filled depends on the platform; most report unsupported ones as 0,
 * Instagram omits them.
 */
export interface PostMetrics {
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  views?: number;
  reach?: number;
  interactions?: number;
  reposts?: number;
  follows?: number;
  profile_visits?: number;
  avg_watch_time_ms?: number;
}

export interface PostMetricsTarget {
  platform: string;
  account_id: string;
  platform_post_id: string;
  metrics?: PostMetrics;
  metrics_synced_at?: string;
  error?: { code?: string; message?: string } | null;
}

export interface CommentCapabilities {
  can_reply: boolean;
  can_delete: boolean;
  can_hide: boolean;
  can_like: boolean;
  can_private_reply: boolean;
}

export type ModerationStatus = "published" | "held_for_review" | "likely_spam" | "rejected";

/** CommentWithCapabilities — GET /inbox/comments/{post_id} and …/replies. */
export interface Comment {
  /** sapi_cmt_… */
  id: string;
  platform_id: string;
  platform: string;
  text: string;
  /** Any author field can be empty when the platform gives none. */
  author_id: string;
  author_name: string;
  author_username: string;
  author_picture: string;
  /** LinkedIn. */
  author_headline?: string;
  /** True when the connected account wrote it. */
  is_owner: boolean;
  like_count: number;
  has_replies: boolean;
  liked_by_viewer: boolean;
  is_hidden: boolean;
  /** YouTube only. */
  moderation_status?: ModerationStatus;
  /** Parent's platform_id; null for a top-level comment. */
  parent_id: string | null;
  created_at: string;
  capabilities: CommentCapabilities;
}

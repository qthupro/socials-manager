/**
 * SocialAPI post schemas (docs.social-api.ai/api-reference/posts, guides/publishing,
 * guides/delivery, guides/media). Field names match the API exactly.
 */

/** Derived from the targets: see guides/delivery. */
export type PostStatus =
  "draft" | "scheduled" | "publishing" | "published" | "partial" | "failed" | "cancelled";

export type PostTargetStatus =
  "pending" | "publishing" | "published" | "failed" | "cancelled" | "unpublished";

export type Visibility = "public" | "private" | "connections_only" | "logged_in";

export interface MediaInput {
  source: string;
  source_type: "url" | "media_id" | "platform_attachment_id";
  /** image | video | audio | file — required for platform_attachment_id. */
  type?: string;
}

export interface PostTargetError {
  code: string;
  message: string;
  category: string;
  caused_by: string;
}

export interface PostTargetMetrics {
  comments: number;
  likes: number;
  saves: number;
  shares: number;
  views?: number;
  reach?: number;
}

export interface PostTarget {
  platform: string;
  status: PostTargetStatus;
  account_id?: string;
  /** sapi_page_… (Facebook). */
  page_id?: string;
  /** Pinterest. */
  board_id?: string;
  text?: string;
  title?: string;
  media?: MediaInput[];
  first_comment?: string;
  visibility?: Visibility;
  scheduled_at?: string;
  /** feed | reel | stories | carousel … */
  media_type?: string;
  /** As sent (Instagram content_type, TikTok media_type, …). */
  platform_data?: Record<string, unknown>;
  platform_post_id?: string;
  permalink?: string;
  published_at?: string;
  error?: PostTargetError;
  metrics?: PostTargetMetrics;
  /** When `metrics` was last refreshed. */
  metrics_synced_at?: string;
}

export interface Post {
  id: string;
  status: PostStatus;
  text: string | null;
  title?: string;
  visibility?: Visibility;
  media?: MediaInput[];
  targets?: PostTarget[];
  hidden: boolean;
  retry_count: number;
  queue_id: string | null;
  first_comment?: string;
  created_at: string;
  updated_at: string;
  scheduled_at?: string;
  published_at?: string;
}

export interface TargetRequest {
  account_id: string;
  page_id?: string;
  board_id?: string;
  /** Per-target overrides. */
  text?: string;
  title?: string;
  media?: MediaInput[];
  first_comment?: string;
  visibility?: Visibility;
  scheduled_at?: string;
  /** Flat keys for this target's platform (no platform slug level). */
  platform_data?: Record<string, unknown>;
}

/**
 * POST /posts. publish_now + targets → publishing; future scheduled_at + targets →
 * scheduled; anything else → draft.
 */
export interface CreatePostRequest {
  text?: string;
  title?: string;
  media?: MediaInput[];
  visibility?: Visibility;
  first_comment?: string;
  scheduled_at?: string;
  publish_now?: boolean;
  queue_id?: string;
  targets?: TargetRequest[];
  platform_data?: Record<string, Record<string, unknown>>;
  skip_duplicate_check?: boolean;
}

/** PATCH /posts/{id} — draft, scheduled or failed posts only. Sending targets replaces them. */
export type UpdatePostRequest = Omit<CreatePostRequest, "publish_now" | "queue_id"> & {
  hidden?: boolean;
};

export interface PostListParams {
  status?: PostStatus;
  platform?: string;
  account_ids?: string;
  brand_id?: string;
  from?: string;
  to?: string;
  search?: string;
  sort?: "scheduled_asc" | "scheduled_desc" | "created_asc" | "created_desc";
  cursor?: string;
  limit?: number;
}

export interface ValidationIssue {
  platform: string;
  field: string;
  message: string;
  target?: string;
}

export interface ValidatePostResponse {
  valid: boolean;
  errors: ValidationIssue[] | null;
  warnings: ValidationIssue[] | null;
}

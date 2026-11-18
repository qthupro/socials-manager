/**
 * SocialAPI analytics + exports schemas (docs: guides/analytics,
 * api-reference/analytics/*, api-reference/exports/*). Field names match the API.
 */

export interface OverviewTotals {
  posts: number;
  /** likes + comments + shares + saves (views are separate). */
  engagements: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  views: number;
}

export interface OverviewDay {
  day: string;
  posts: number;
  engagements: number;
}

export interface OverviewPlatform extends OverviewTotals {
  platform: string;
}

export interface OverviewFormat {
  /** image | video | reel | carousel_album | … | unknown */
  media_type: string;
  posts: number;
  engagements: number;
}

export interface OverviewTopPost {
  post_id: string;
  account_id: string;
  platform: string;
  media_type: string;
  published_at: string;
  text?: string;
  permalink?: string;
  /** Expiring link. */
  thumbnail?: string;
  metrics: Omit<OverviewTotals, "posts">;
}

export interface BestTimeCell {
  /** 1 = Monday … 7 = Sunday. */
  weekday: number;
  hour: number;
  posts: number;
  avg_engagements: number;
}

export interface AnalyticsPoint {
  day: string;
  value: number;
  subjects_counted: number;
  change?: number;
  days_spanned?: number;
}

export interface MetricSeries {
  metric: string;
  /** gauge = a level (diff it); flow = a per-day count (sum it). */
  kind: "gauge" | "flow";
  source: "reported" | "sampled" | "owned" | "mixed";
  day_tz: string;
  points: AnalyticsPoint[];
}

export interface AnalyticsOverview {
  from: string;
  to: string;
  tz: string;
  /** Most recent counter refresh among posts in range. */
  metrics_synced_at?: string;
  totals: OverviewTotals;
  /** Same-length window ending the day before `from`. */
  previous: OverviewTotals;
  by_day: OverviewDay[];
  by_platform: OverviewPlatform[];
  by_format: OverviewFormat[];
  top_posts: OverviewTopPost[];
  /** When YOUR past posts did well — not when the audience is online. */
  best_times: { posts_considered: number; cells: BestTimeCell[] };
  /** Team activity (UTC days): replies_sent, dms_sent, … */
  activity: MetricSeries[];
  /** Accounts left out for lacking the analytics.read permission. */
  accounts_excluded: number;
}

export type OverviewSort = "engagements" | "likes" | "comments" | "shares" | "views";

export interface OverviewParams {
  /** YYYY-MM-DD, cut in tz. Max range 400 days. */
  from?: string;
  to?: string;
  tz?: string;
  account_id?: string;
  brand_id?: string;
  platform?: string;
  sort?: OverviewSort;
}

export type ExportStatus = "pending" | "processing" | "completed" | "failed" | (string & {});

export interface ExportItem {
  id: string;
  account_id: string;
  platform: string;
  status: ExportStatus;
  created_at: string;
  expires_at: string;
  processed_videos: number;
  total_videos: number;
  completed_at?: string;
  error?: string;
}

export interface ExportStatusResponse extends ExportItem {
  result?: { excel_url: string; report_url: string };
}

export interface CreateExportParams {
  include_transcript?: boolean;
  /** Paid plans only (ignored on Free). */
  include_vision?: boolean;
}

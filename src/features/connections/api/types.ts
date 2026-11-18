/** SocialAPI schemas used by the connections feature (see docs.social-api.ai/api-reference). */

export interface Brand {
  id: string;
  name: string;
  accounts_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * Guide: active | reconnect_recommended | token_expired.
 * OpenAPI also mentions reconnect_required — handle all of them.
 */
export type AccountStatus =
  "active" | "reconnect_recommended" | "token_expired" | "reconnect_required" | (string & {});

export interface SocialAccount {
  id: string;
  /** May be an alias like instagram_fb / linkedin_page — use getPlatform() to resolve. */
  platform: string;
  name: string;
  username: string;
  profile_picture_url?: string;
  bio?: string;
  brand_id: string;
  status: AccountStatus;
  reconnect_reason?: string;
  connection_type?: "profile" | "organization";
  login_id?: string;
  page_name?: string;
  metadata?: Record<string, unknown>;
  /** null = all permissions. */
  permissions: string[] | null;
  effective_permissions: string[];
}

export interface ConnectRequest {
  platform: string;
  brand_id?: string;
  redirect_uri?: string;
  state?: string;
  permissions?: string[];
  metadata?: Record<string, string>;
}

/** 202: consent-screen platforms. */
export interface ConnectOAuthResponse {
  auth_url: string;
  state: string;
  message: string;
}

/** 201: credential platforms (Telegram, Bluesky, App Store Connect). */
export interface ConnectAccountResponse {
  account_id: string;
  brand_id: string;
  platform: string;
  username: string;
  display_name: string;
}

export type ConnectResponse = ConnectOAuthResponse | ConnectAccountResponse;

export const isOAuthResponse = (r: ConnectResponse): r is ConnectOAuthResponse => "auth_url" in r;

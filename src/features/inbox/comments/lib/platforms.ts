import type { SocialAccount } from "@/features/connections";
import { getPlatform, type PlatformSlug } from "@/shared/config/platforms";

/** Platforms with a comments inbox (docs: platforms/overview). */
const COMMENT_PLATFORMS = new Set<PlatformSlug>([
  "facebook",
  "instagram",
  "threads",
  "tiktok",
  "linkedin",
  "twitter",
  "bluesky",
  "youtube",
]);

/** Accounts whose comments can be listed. LinkedIn member profiles can't (501). */
export function canListComments(a: SocialAccount) {
  const slug = getPlatform(a.platform)?.slug;
  if (!slug || !COMMENT_PLATFORMS.has(slug)) return false;
  if (slug === "linkedin" && a.connection_type === "profile") return false;
  return true;
}

/** Reply length limits the platforms enforce (docs: platforms/{p}/comments). */
export const REPLY_MAX: Partial<Record<PlatformSlug, number>> = {
  threads: 500,
  tiktok: 1200,
  twitter: 280,
  bluesky: 300,
};

export const replyMaxFor = (platform: string) => {
  const slug = getPlatform(platform)?.slug;
  return slug ? REPLY_MAX[slug] : undefined;
};

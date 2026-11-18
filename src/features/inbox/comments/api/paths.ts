import { getPlatform } from "@/shared/config/platforms";

import type { InboxPost } from "../types";

/**
 * {post_id} in paths: LinkedIn URNs go in un-encoded (per the docs), everything else
 * — notably Bluesky AT URIs — must be URL-encoded.
 */
export function postPath(post: Pick<InboxPost, "id" | "platform">) {
  return getPlatform(post.platform)?.slug === "linkedin" ? post.id : encodeURIComponent(post.id);
}

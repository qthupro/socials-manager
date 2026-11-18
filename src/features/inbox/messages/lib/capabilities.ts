/**
 * What each platform allows in DMs (docs: platforms/{p}/messages, guides/direct-messages).
 * Conversations carry no capability flags, so the client decides from this table.
 */
import { getPlatform, type PlatformSlug } from "@/shared/config/platforms";

import type { Message } from "../types";

export interface DmCapabilities {
  /** Hours after the customer's last message during which you may reply; null = no window. */
  windowHours: number | null;
  /** Max text length (characters; Instagram's limit is in bytes, approximated). */
  textMax: number;
  attachments: boolean;
  reactions: boolean;
  /** typing_on / mark_seen sender actions. */
  senderActions: boolean;
  replyTo: boolean;
  /** unread_count is always 0 on these. */
  unreadCounts: boolean;
}

const BASE: DmCapabilities = {
  windowHours: null,
  textMax: 2000,
  attachments: true,
  reactions: false,
  senderActions: false,
  replyTo: false,
  unreadCounts: true,
};

const CAPS: Partial<Record<PlatformSlug, Partial<DmCapabilities>>> = {
  instagram: { windowHours: 24, textMax: 1000, reactions: true, senderActions: true },
  facebook: { windowHours: 24, textMax: 2000, reactions: true, senderActions: true, replyTo: true },
  whatsapp: { windowHours: 24, textMax: 4096, senderActions: true },
  telegram: { textMax: 4096 },
  zalo: { windowHours: 24 * 7, textMax: 2000, replyTo: true, unreadCounts: false },
  twitter: { textMax: 1000, attachments: false, unreadCounts: false },
  bluesky: { textMax: 1000, attachments: false, unreadCounts: false },
};

/** Platforms with DMs in SocialAPI. */
export const DM_PLATFORMS = new Set<PlatformSlug>(Object.keys(CAPS) as PlatformSlug[]);

export function isDmPlatform(platform: string) {
  const slug = getPlatform(platform)?.slug;
  return !!slug && DM_PLATFORMS.has(slug);
}

export function getDmCapabilities(platform: string): DmCapabilities {
  const slug = getPlatform(platform)?.slug;
  const caps = { ...BASE, ...(slug ? CAPS[slug] : undefined) };
  // Reply-to works on Instagram only through Facebook Login.
  if (platform === "instagram_fb") caps.replyTo = true;
  return caps;
}

/**
 * Whether the reply window is still open, from the latest incoming message.
 * `messages` is oldest-first. Returns true for platforms without a window.
 */
export function isWindowOpen(caps: DmCapabilities, messages: Message[]): boolean {
  if (caps.windowHours === null) return true;
  const lastIn = [...messages].reverse().find((m) => m.direction === "incoming");
  if (!lastIn) return false;
  return Date.now() - new Date(lastIn.created_at).getTime() < caps.windowHours * 3_600_000;
}

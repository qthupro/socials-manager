/**
 * Public API of the inbox feature — Unified inbox: DMs, comments, reviews, mentions.
 * Other code imports ONLY from "@/features/inbox", never from its internals.
 */
import { AtSign, MessageCircle, MessagesSquare, Star } from "lucide-react";

import type { FeatureModule, RouteHandle } from "@/shared/types/feature";

/** App-wide background services (mounted by the app layout). */
export { InboxNotifier } from "./messages/components/inbox-notifier";
export { CommentAutomationEngine } from "./comments/automation/engine";
export { DmBotEngine } from "./messages/bot/engine";

export const inboxFeature: FeatureModule = {
  id: "inbox",
  routes: [
    {
      path: "inbox/messages",
      handle: { fullBleed: true } satisfies RouteHandle,
      lazy: async () => ({ Component: (await import("./pages/messages-page")).MessagesPage }),
    },
    {
      path: "inbox/comments",
      handle: { fullBleed: true } satisfies RouteHandle,
      lazy: async () => ({ Component: (await import("./pages/comments-page")).CommentsPage }),
    },
    {
      path: "inbox/reviews",
      lazy: async () => ({ Component: (await import("./pages/reviews-page")).ReviewsPage }),
    },
    {
      path: "inbox/mentions",
      lazy: async () => ({ Component: (await import("./pages/mentions-page")).MentionsPage }),
    },
  ],
  nav: [
    { label: "Tin nhắn", path: "/inbox/messages", icon: MessageCircle, group: "inbox", order: 10 },
    {
      label: "Bình luận",
      path: "/inbox/comments",
      icon: MessagesSquare,
      group: "inbox",
      order: 20,
    },
    { label: "Đánh giá", path: "/inbox/reviews", icon: Star, group: "inbox", order: 30 },
    { label: "Lượt nhắc", path: "/inbox/mentions", icon: AtSign, group: "inbox", order: 40 },
  ],
};

/**
 * Public API of the publishing feature — Posts, scheduling, queues and media library.
 * Other code imports ONLY from "@/features/publishing", never from its internals.
 */
import { CalendarDays, FileText, Images, ListOrdered } from "lucide-react";

import type { FeatureModule } from "@/shared/types/feature";

export const publishingFeature: FeatureModule = {
  id: "publishing",
  routes: [
    {
      path: "posts",
      lazy: async () => ({ Component: (await import("./pages/posts-page")).PostsPage }),
    },
    {
      path: "posts/new",
      lazy: async () => ({
        Component: (await import("./pages/post-editor-page")).PostEditorPage,
      }),
    },
    {
      path: "posts/:postId/edit",
      lazy: async () => ({
        Component: (await import("./pages/post-editor-page")).PostEditorPage,
      }),
    },
    {
      path: "calendar",
      lazy: async () => ({ Component: (await import("./pages/calendar-page")).CalendarPage }),
    },
    {
      path: "queues",
      lazy: async () => ({ Component: (await import("./pages/queues-page")).QueuesPage }),
    },
    {
      path: "media",
      lazy: async () => ({ Component: (await import("./pages/media-page")).MediaPage }),
    },
  ],
  nav: [
    { label: "Bài đăng", path: "/posts", icon: FileText, group: "publishing", order: 10 },
    { label: "Lịch đăng", path: "/calendar", icon: CalendarDays, group: "publishing", order: 20 },
    { label: "Hàng đợi", path: "/queues", icon: ListOrdered, group: "publishing", order: 30 },
    { label: "Thư viện media", path: "/media", icon: Images, group: "publishing", order: 40 },
  ],
};

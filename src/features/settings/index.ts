/**
 * Public API of the settings feature — Setup guide and app settings.
 * Other code imports ONLY from "@/features/settings", never from its internals.
 */
import { BookOpenCheck, Settings } from "lucide-react";
import { redirect } from "react-router";

import type { FeatureModule } from "@/shared/types/feature";

export const settingsFeature: FeatureModule = {
  id: "settings",
  routes: [
    {
      path: "guide",
      lazy: async () => ({ Component: (await import("./pages/guide-page")).GuidePage }),
    },
    // Old "Gói & sử dụng" route.
    { path: "usage", loader: () => redirect("/guide") },
    {
      path: "settings",
      lazy: async () => ({ Component: (await import("./pages/settings-page")).SettingsPage }),
    },
  ],
  nav: [
    { label: "Hướng dẫn", path: "/guide", icon: BookOpenCheck, group: "system", order: 10 },
    { label: "Cài đặt", path: "/settings", icon: Settings, group: "system", order: 20 },
  ],
};

// Shared with the dashboard welcome screen.
export { SignupDiscountBadge, SOCIAL_API_SIGNUP_URL } from "./components/api-key-section";

/**
 * Public API of the automations feature — Keyword-based auto replies (Instagram, Facebook).
 * Other code imports ONLY from "@/features/automations", never from its internals.
 */
import { Bot } from "lucide-react";

import type { FeatureModule } from "@/shared/types/feature";

export const automationsFeature: FeatureModule = {
  id: "automations",
  routes: [
    {
      path: "automations",
      lazy: async () => ({ Component: (await import("./pages/automations-page")).AutomationsPage }),
    },
  ],
  nav: [{ label: "Tự động trả lời", path: "/automations", icon: Bot, group: "inbox", order: 50 }],
};

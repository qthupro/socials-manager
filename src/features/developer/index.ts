/**
 * Public API of the developer feature — Webhooks, event log and API keys.
 * Other code imports ONLY from "@/features/developer", never from its internals.
 */
import { KeyRound, ScrollText, Webhook } from "lucide-react";

import type { FeatureModule } from "@/shared/types/feature";

export const developerFeature: FeatureModule = {
  id: "developer",
  routes: [
    {
      path: "webhooks",
      lazy: async () => ({ Component: (await import("./pages/webhooks-page")).WebhooksPage }),
    },
    {
      path: "events",
      lazy: async () => ({ Component: (await import("./pages/events-page")).EventsPage }),
    },
    {
      path: "api-keys",
      lazy: async () => ({ Component: (await import("./pages/api-keys-page")).ApiKeysPage }),
    },
  ],
  nav: [
    { label: "Webhooks", path: "/webhooks", icon: Webhook, group: "developer", order: 10 },
    { label: "Nhật ký sự kiện", path: "/events", icon: ScrollText, group: "developer", order: 20 },
    { label: "API Keys", path: "/api-keys", icon: KeyRound, group: "developer", order: 30 },
  ],
};

export { useEventsSummary } from "./api/events";

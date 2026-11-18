/**
 * Public API of the dashboard feature — Overview dashboard.
 * Other code imports ONLY from "@/features/dashboard", never from its internals.
 */
import { LayoutDashboard } from "lucide-react";

import type { FeatureModule } from "@/shared/types/feature";

export const dashboardFeature: FeatureModule = {
  id: "dashboard",
  routes: [
    {
      index: true,
      lazy: async () => ({ Component: (await import("./pages/dashboard-page")).DashboardPage }),
    },
  ],
  nav: [{ label: "Tổng quan", path: "/", icon: LayoutDashboard, group: "overview", order: 10 }],
};

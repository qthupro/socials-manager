/**
 * Public API of the analytics feature — Analytics and exports.
 * Other code imports ONLY from "@/features/analytics", never from its internals.
 */
import { ChartLine, FileDown } from "lucide-react";

import type { FeatureModule } from "@/shared/types/feature";

export const analyticsFeature: FeatureModule = {
  id: "analytics",
  routes: [
    {
      path: "analytics",
      lazy: async () => ({ Component: (await import("./pages/analytics-page")).AnalyticsPage }),
    },
    {
      path: "analytics/exports",
      lazy: async () => ({ Component: (await import("./pages/exports-page")).ExportsPage }),
    },
  ],
  nav: [
    { label: "Thống kê", path: "/analytics", icon: ChartLine, group: "insights", order: 10 },
    {
      label: "Xuất báo cáo",
      path: "/analytics/exports",
      icon: FileDown,
      group: "insights",
      order: 20,
    },
  ],
};

export { useAnalyticsOverview } from "./api/analytics";
export type { AnalyticsOverview, OverviewParams } from "./api/types";
export { BarList, StatTile, TimeChart } from "./components/charts";
export { dmy, fmtFull } from "./lib/format";

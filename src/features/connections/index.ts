/**
 * Public API of the connections feature — Connected social accounts and brands.
 * Other code imports ONLY from "@/features/connections", never from its internals.
 */
import { Building2, Plug } from "lucide-react";

import type { FeatureModule } from "@/shared/types/feature";

export const connectionsFeature: FeatureModule = {
  id: "connections",
  routes: [
    {
      path: "accounts",
      lazy: async () => ({ Component: (await import("./pages/accounts-page")).AccountsPage }),
    },
    {
      path: "accounts/:accountId/pages",
      lazy: async () => ({
        Component: (await import("./pages/facebook-pages-page")).FacebookPagesPage,
      }),
    },
    {
      path: "brands",
      lazy: async () => ({ Component: (await import("./pages/brands-page")).BrandsPage }),
    },
    {
      path: "brands/:brandId",
      lazy: async () => ({
        Component: (await import("./pages/brand-detail-page")).BrandDetailPage,
      }),
    },
  ],
  nav: [
    { label: "Tài khoản", path: "/accounts", icon: Plug, group: "connections", order: 10 },
    { label: "Thương hiệu", path: "/brands", icon: Building2, group: "connections", order: 20 },
  ],
};

// Shared with other features (inbox, publishing…).
export { useAccounts } from "./api/accounts";
export { useBrands } from "./api/brands";
export { accountPagesQuery, type AccountPage } from "./api/facebook-pages";
export type { Brand, SocialAccount } from "./api/types";

/**
 * Feature registry — the ONE place to plug a feature into the app.
 * Adding a feature: create `src/features/<name>/index.ts` exporting a FeatureModule,
 * then add it to this list. Routes and sidebar entries are derived automatically.
 */
import { analyticsFeature } from "@/features/analytics";
import { automationsFeature } from "@/features/automations";
import { connectionsFeature } from "@/features/connections";
import { dashboardFeature } from "@/features/dashboard";
import { developerFeature } from "@/features/developer";
import { inboxFeature } from "@/features/inbox";
import { publishingFeature } from "@/features/publishing";
import { settingsFeature } from "@/features/settings";
import { NAV_GROUPS, type NavGroup } from "@/shared/config/navigation";
import type { FeatureModule, FeatureNavItem } from "@/shared/types/feature";

export const features: FeatureModule[] = [
  dashboardFeature,
  inboxFeature,
  automationsFeature,
  publishingFeature,
  analyticsFeature,
  connectionsFeature,
  developerFeature,
  settingsFeature,
];

export const navItems = features.flatMap((f) => f.nav ?? []);

/** Sidebar sections in display order, each with its items sorted. Empty groups are dropped. */
export const navSections = (Object.keys(NAV_GROUPS) as NavGroup[])
  .sort((a, b) => NAV_GROUPS[a].order - NAV_GROUPS[b].order)
  .map((group) => ({
    group,
    label: NAV_GROUPS[group].label,
    icon: NAV_GROUPS[group].icon,
    items: navItems.filter((i) => i.group === group).sort((a, b) => a.order - b.order),
  }))
  .filter((s) => s.items.length > 0);

/** The nav item for a pathname: exact match first, then the longest prefix. */
export function findNavItem(pathname: string): FeatureNavItem | undefined {
  return (
    navItems.find((i) => i.path === pathname) ??
    navItems
      .filter((i) => i.path !== "/" && pathname.startsWith(`${i.path}/`))
      .sort((a, b) => b.path.length - a.path.length)[0]
  );
}

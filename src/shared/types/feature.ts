import type { LucideIcon } from "lucide-react";
import type { RouteObject } from "react-router";

import type { NavGroup } from "@/shared/config/navigation";

export interface FeatureNavItem {
  label: string;
  /** Absolute path, e.g. "/inbox/messages". */
  path: string;
  icon: LucideIcon;
  /** Sidebar section, see NAV_GROUPS. */
  group: NavGroup;
  /** Order inside its group, lower first. */
  order: number;
}

/** Per-route layout hints, set via a route's `handle`. */
export interface RouteHandle {
  /** Page fills the content area edge to edge and manages its own scrolling (e.g. chat). */
  fullBleed?: boolean;
}

/**
 * The contract every feature exposes from its `index.ts`.
 * Registering a feature in `src/app/features.ts` mounts its routes
 * and adds its `nav` items to the sidebar.
 */
export interface FeatureModule {
  id: string;
  /** Mounted under "/", use relative paths ("posts", "inbox/messages"). */
  routes: RouteObject[];
  nav?: FeatureNavItem[];
}

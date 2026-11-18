import { ChartPie, Code, Inbox, Link2, SquarePen, type LucideIcon } from "lucide-react";

interface NavGroupConfig {
  /** Empty label = items are shown flat (not inside a dropdown group). */
  label: string;
  icon?: LucideIcon;
  order: number;
}

/**
 * Sidebar groups, in display order. Features pick a group for each nav item;
 * the group's label/icon/order lives here so features don't need to know about each other.
 */
const groups = {
  overview: { label: "", order: 0 },
  inbox: { label: "Hộp thư", icon: Inbox, order: 10 },
  publishing: { label: "Đăng bài", icon: SquarePen, order: 20 },
  insights: { label: "Phân tích", icon: ChartPie, order: 30 },
  connections: { label: "Kết nối", icon: Link2, order: 40 },
  developer: { label: "Nhà phát triển", icon: Code, order: 50 },
  // Pinned to the bottom of the sidebar.
  system: { label: "", order: 100 },
} satisfies Record<string, NavGroupConfig>;

export type NavGroup = keyof typeof groups;

export const NAV_GROUPS: Record<NavGroup, NavGroupConfig> = groups;

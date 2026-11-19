import { ChevronRight, type LucideIcon } from "lucide-react";
import { useEffect } from "react";
import { Link, useLocation } from "react-router";

import { AboutDialog, DEVELOPER } from "@/features/about";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/shared/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from "@/shared/components/ui/sidebar";
import type { FeatureNavItem } from "@/shared/types/feature";

import { findNavItem, navSections } from "../features";
import { useLayoutStore } from "./layout-store";

type Section = (typeof navSections)[number];

/** A single top-level link (sections without a label, e.g. Overview / Settings). */
function NavLinkItem({ item, active }: { item: FeatureNavItem; active?: FeatureNavItem }) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={item === active} tooltip={item.label}>
        <Link to={item.path}>
          <item.icon />
          <span>{item.label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

/**
 * A labelled section rendered as a dropdown group:
 * expandable in the full sidebar, a flyout menu when the sidebar is collapsed to icons.
 */
function NavGroupItem({
  section,
  icon: Icon,
  active,
}: {
  section: Section;
  icon: LucideIcon;
  active?: FeatureNavItem;
}) {
  const { state, isMobile } = useSidebar();
  const open = useLayoutStore((s) => s.openNavGroups.includes(section.group));
  const setNavGroupOpen = useLayoutStore((s) => s.setNavGroupOpen);
  const containsActive = !!active && section.items.includes(active);

  if (state === "collapsed" && !isMobile) {
    return (
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton tooltip={section.label} isActive={containsActive}>
              <Icon />
              <span>{section.label}</span>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="start" className="min-w-52">
            <DropdownMenuLabel>{section.label}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {section.items.map((item) => (
              <DropdownMenuItem key={item.path} asChild>
                <Link to={item.path} className={item === active ? "bg-accent" : undefined}>
                  <item.icon />
                  {item.label}
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    );
  }

  return (
    <Collapsible
      asChild
      open={open}
      onOpenChange={(next) => setNavGroupOpen(section.group, next)}
      className="group/collapsible"
    >
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          {/* Highlight the group itself when it's closed but holds the current page. */}
          <SidebarMenuButton tooltip={section.label} isActive={containsActive && !open}>
            <Icon />
            <span>{section.label}</span>
            <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
          <SidebarMenuSub>
            {section.items.map((item) => (
              <SidebarMenuSubItem key={item.path}>
                <SidebarMenuSubButton asChild isActive={item === active}>
                  <Link to={item.path}>
                    <item.icon />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

export function AppSidebar() {
  const { pathname } = useLocation();
  const active = findNavItem(pathname);
  const setNavGroupOpen = useLayoutStore((s) => s.setNavGroupOpen);

  // Navigating to a page opens the group that contains it.
  useEffect(() => {
    if (active) setNavGroupOpen(active.group, true);
  }, [active, setNavGroupOpen]);

  return (
    // Sits below the custom title bar (h-9 = 2.25rem) instead of covering the full window.
    <Sidebar collapsible="icon" className="top-9 h-[calc(100svh-2.25rem)]">
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {navSections
              .filter((s) => s.group !== "system")
              .map((section) =>
                section.label && section.icon ? (
                  <NavGroupItem
                    key={section.group}
                    section={section}
                    icon={section.icon}
                    active={active}
                  />
                ) : (
                  section.items.map((item) => (
                    <NavLinkItem key={item.path} item={item} active={active} />
                  ))
                ),
              )}
          </SidebarMenu>
        </SidebarGroup>

        {/* "system" items (Usage, Settings) are pinned to the bottom. */}
        <SidebarGroup className="mt-auto">
          <SidebarMenu>
            {navSections
              .find((s) => s.group === "system")
              ?.items.map((item) => (
                <NavLinkItem key={item.path} item={item} active={active} />
              ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      {/* One compact row; details (contacts, licence…) are in the About dialog. */}
      <SidebarFooter className="border-t">
        <AboutDialog>
          <button
            type="button"
            title="Thông tin phần mềm & nhà phát triển"
            className="flex w-full items-center gap-2 rounded-md p-1 text-left transition-colors group-data-[collapsible=icon]:justify-center hover:bg-sidebar-accent"
          >
            <img
              src={DEVELOPER.avatar}
              alt=""
              className="size-6 shrink-0 rounded-full bg-white object-cover ring-1 ring-border"
            />
            <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
              {DEVELOPER.name}
            </span>
            <span className="font-mono text-[11px] text-muted-foreground group-data-[collapsible=icon]:hidden">
              v{__APP_VERSION__}
            </span>
          </button>
        </AboutDialog>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

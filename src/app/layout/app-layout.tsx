import { Outlet, useMatches } from "react-router";

import { CommentAutomationEngine, DmBotEngine, InboxNotifier } from "@/features/inbox";
import { RealtimeManager } from "@/features/realtime";
import { SidebarInset, SidebarProvider } from "@/shared/components/ui/sidebar";
import { cn } from "@/shared/lib/utils";
import type { RouteHandle } from "@/shared/types/feature";
import { useApplyTheme } from "@/shared/theme";

import { AppNavbar } from "./app-navbar";
import { AppSidebar } from "./app-sidebar";
import { DesktopBridge } from "./desktop-bridge";
import { useLayoutStore } from "./layout-store";
import { TitleBar } from "./title-bar";

export function AppLayout() {
  useApplyTheme();
  const { sidebarOpen, setSidebarOpen } = useLayoutStore();
  // Routes can opt into an edge-to-edge content area via `handle: { fullBleed: true }`.
  const fullBleed = useMatches().some((m) => (m.handle as RouteHandle | undefined)?.fullBleed);

  return (
    <div className="flex h-full flex-col">
      {/* Background services (render nothing). */}
      <DesktopBridge />
      <RealtimeManager />
      <InboxNotifier />
      <CommentAutomationEngine />
      <DmBotEngine />

      <TitleBar />
      <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen} className="min-h-0 flex-1">
        <AppSidebar />
        <SidebarInset className="min-h-0">
          <AppNavbar />
          <div
            className={cn("min-h-0 flex-1", fullBleed ? "overflow-hidden" : "overflow-y-auto p-4")}
          >
            <Outlet />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}

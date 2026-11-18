import { Heart } from "lucide-react";
import { useLocation } from "react-router";

import { DonateDialog } from "@/features/donate";
import { Button } from "@/shared/components/ui/button";
import { Separator } from "@/shared/components/ui/separator";
import { SidebarTrigger } from "@/shared/components/ui/sidebar";

import { findNavItem } from "../features";
import { ThemeToggle } from "./theme-toggle";

export function AppNavbar() {
  const { pathname } = useLocation();
  const title = findNavItem(pathname)?.label;

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b px-3">
      <SidebarTrigger />
      <Separator orientation="vertical" className="mr-1 data-[orientation=vertical]:h-4" />
      <h1 className="text-sm font-medium">{title}</h1>

      {/* Right side: global actions */}
      <div className="ml-auto flex items-center gap-1">
        <DonateDialog>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Heart className="fill-rose-500 text-rose-500" />
            Ủng hộ
          </Button>
        </DonateDialog>
        <ThemeToggle />
      </div>
    </header>
  );
}

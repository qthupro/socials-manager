import { Copy, Minus, Square, X } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/shared/lib/utils";
import { useWindowControls } from "@/shared/platform/window";

function ControlButton({
  label,
  onClick,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "inline-flex h-full w-11 items-center justify-center transition-colors [&_svg]:size-4",
        danger ? "hover:bg-red-600 hover:text-white" : "hover:bg-sidebar-accent",
      )}
    >
      {children}
    </button>
  );
}

export function TitleBar() {
  const { available, maximized, minimize, toggleMaximize, close } = useWindowControls();

  return (
    // data-tauri-drag-region: drag to move, double-click to maximize.
    <header
      data-tauri-drag-region
      className="flex h-9 shrink-0 items-center border-b bg-sidebar text-sidebar-foreground select-none"
    >
      <div data-tauri-drag-region className="flex flex-1 items-center gap-2 px-3">
        <img src="/app-icon.svg" alt="" className="pointer-events-none size-4" />
        <span data-tauri-drag-region className="text-xs font-medium">
          Social Manager
        </span>
      </div>

      {available && (
        <div className="flex h-full">
          <ControlButton label="Thu nhỏ" onClick={minimize}>
            <Minus />
          </ControlButton>
          <ControlButton label={maximized ? "Khôi phục" : "Phóng to"} onClick={toggleMaximize}>
            {maximized ? <Copy className="-scale-x-100" /> : <Square />}
          </ControlButton>
          <ControlButton label="Đóng" onClick={close} danger>
            <X />
          </ControlButton>
        </div>
      )}
    </header>
  );
}

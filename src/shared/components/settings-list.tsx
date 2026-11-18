import type { ReactNode } from "react";

import { cn } from "@/shared/lib/utils";

/** A titled group of setting rows (macOS / Linear-style list). */
export function SettingsSection({
  title,
  action,
  children,
}: {
  title: string;
  /** Small element on the right of the title (e.g. a status). */
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {title}
        </h3>
        {action}
      </div>
      <div className="divide-y overflow-hidden rounded-xl border bg-card">{children}</div>
    </section>
  );
}

/** One setting: label + one-line hint on the left, control on the right. */
export function SettingsRow({
  label,
  hint,
  children,
  className,
}: {
  label: ReactNode;
  hint?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-h-14 items-center justify-between gap-4 px-4 py-2.5", className)}>
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        {hint && <div className="truncate text-xs text-muted-foreground">{hint}</div>}
      </div>
      {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
    </div>
  );
}

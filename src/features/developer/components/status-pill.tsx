import { cn } from "@/shared/lib/utils";

import type { Tone } from "../lib/status";

const TONES: Record<Tone, string> = {
  ok: "bg-green-500/15 text-green-700 dark:text-green-300",
  warn: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  fail: "bg-destructive/15 text-destructive",
  muted: "bg-muted text-muted-foreground",
};

export function StatusPill({
  tone,
  children,
  className,
}: {
  tone: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

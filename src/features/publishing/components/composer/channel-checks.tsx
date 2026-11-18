import { CircleAlert, CircleCheck, TriangleAlert } from "lucide-react";

import { PlatformIcon } from "@/shared/components/platform-icon";

import { platformLabel } from "../../lib/formats";

export interface ChannelCheck {
  platform: string;
  errors: string[];
  warnings: string[];
}

/** One line per selected platform: ready, or exactly what's wrong for it. */
export function ChannelChecks({ checks }: { checks: ChannelCheck[] }) {
  if (checks.length === 0) return null;
  return (
    <ul className="space-y-2">
      {checks.map((c) => (
        <li key={c.platform} className="flex gap-2 text-xs">
          <PlatformIcon platform={c.platform} size="sm" className="mt-px size-4 [&_svg]:size-2.5" />
          <div className="min-w-0 flex-1 space-y-0.5">
            <p className="flex items-center gap-1 font-medium">
              {platformLabel(c.platform)}
              {c.errors.length === 0 && <CircleCheck className="size-3.5 text-green-600" />}
            </p>
            {c.errors.map((e) => (
              <p key={e} className="flex gap-1 text-destructive">
                <CircleAlert className="mt-px size-3 shrink-0" /> {e}
              </p>
            ))}
            {c.warnings.map((w) => (
              <p key={w} className="flex gap-1 text-amber-600 dark:text-amber-400">
                <TriangleAlert className="mt-px size-3 shrink-0" /> {w}
              </p>
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}

import { AccountAvatar } from "@/shared/components/account-avatar";
import { getPlatform } from "@/shared/config/platforms";
import { cn } from "@/shared/lib/utils";

import type { PostStatus, PostTarget } from "../api/types";
import { POST_STATUS, TARGET_STATUS } from "../lib/status";
import type { TargetOption } from "../lib/targets";

export function PostStatusBadge({ status }: { status: PostStatus }) {
  const s = POST_STATUS[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        s.className,
      )}
    >
      {s.label}
    </span>
  );
}

/** Overlapping avatars of the target accounts, each with its delivery status dot. */
export function PostTargets({
  targets,
  optionOf,
  max = 5,
}: {
  targets: PostTarget[];
  optionOf: (t: PostTarget) => TargetOption | undefined;
  max?: number;
}) {
  if (targets.length === 0) {
    return <span className="text-xs text-muted-foreground">Chưa chọn kênh</span>;
  }
  const shown = targets.slice(0, max);
  return (
    <div className="flex items-center -space-x-1.5">
      {shown.map((t, i) => {
        const o = optionOf(t);
        const name = o?.name ?? getPlatform(t.platform)?.label ?? t.platform;
        return (
          <span key={i} className="relative" title={`${name} · ${TARGET_STATUS[t.status].label}`}>
            <AccountAvatar picture={o?.picture} platform={t.platform} size="md" />
            <span
              className={cn(
                "absolute -top-0.5 -right-0.5 size-2.5 rounded-full ring-2 ring-background",
                TARGET_STATUS[t.status].dot,
              )}
            />
          </span>
        );
      })}
      {targets.length > max && (
        <span className="flex size-8 items-center justify-center rounded-full bg-muted text-xs ring-2 ring-background">
          +{targets.length - max}
        </span>
      )}
    </div>
  );
}

import { useState } from "react";

import { cn } from "@/shared/lib/utils";

import { PlatformIcon } from "./platform-icon";

const SIZES = {
  sm: { box: "size-5", badge: "size-3 rounded-[4px] [&_svg]:size-2" },
  md: { box: "size-8", badge: "size-4 rounded-[5px] [&_svg]:size-2.5" },
};

/**
 * A connected account / Page: its profile picture with the platform logo in the corner.
 * Falls back to the platform logo alone when there's no picture (or it fails to load).
 */
export function AccountAvatar({
  picture,
  platform,
  size = "sm",
  className,
}: {
  picture?: string;
  platform: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  const s = SIZES[size];

  if (!picture || broken) {
    return (
      <PlatformIcon platform={platform} size={size} className={cn("rounded-full", className)} />
    );
  }

  return (
    <span className={cn("relative inline-flex shrink-0", s.box, className)}>
      <img
        src={picture}
        alt=""
        onError={() => setBroken(true)}
        className="size-full rounded-full bg-muted object-cover"
      />
      <PlatformIcon
        platform={platform}
        size="sm"
        className={cn("absolute -right-1 -bottom-1 shadow-none ring-2 ring-popover", s.badge)}
      />
    </span>
  );
}

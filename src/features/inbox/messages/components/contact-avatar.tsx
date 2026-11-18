import { useState } from "react";

import { PlatformIcon } from "@/shared/components/platform-icon";
import { cn } from "@/shared/lib/utils";

const COLORS = [
  "bg-blue-500",
  "bg-indigo-500",
  "bg-violet-500",
  "bg-sky-500",
  "bg-teal-500",
  "bg-cyan-600",
  "bg-emerald-500",
  "bg-slate-500",
];

const SIZES = {
  sm: "size-7 text-[10px]",
  md: "size-10 text-sm",
  lg: "size-16 text-xl",
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return ((parts[0][0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

function colorFor(seed: string) {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) | 0;
  return COLORS[Math.abs(h) % COLORS.length];
}

/** Contact photo (or initials), with an optional platform badge in the corner. */
export function ContactAvatar({
  name,
  picture,
  seed,
  platform,
  size = "md",
}: {
  name: string;
  picture?: string;
  /** Stable value for the fallback colour (e.g. participant id). */
  seed: string;
  platform?: string;
  size?: keyof typeof SIZES;
}) {
  // Platform CDN avatars expire; fall back to initials when one fails to load.
  const [broken, setBroken] = useState(false);

  return (
    <span className="relative inline-flex shrink-0">
      {picture && !broken ? (
        <img
          src={picture}
          alt=""
          onError={() => setBroken(true)}
          className={cn("rounded-full bg-muted object-cover", SIZES[size])}
        />
      ) : (
        <span
          className={cn(
            "flex items-center justify-center rounded-full font-semibold text-white",
            SIZES[size],
            colorFor(seed),
          )}
        >
          {initials(name)}
        </span>
      )}
      {platform && (
        <PlatformIcon
          platform={platform}
          size="sm"
          className={cn(
            "absolute -right-0.5 -bottom-0.5 rounded-full ring-2 ring-background",
            size === "lg" ? "size-6 [&_svg]:size-3.5" : "size-4 [&_svg]:size-2.5",
          )}
        />
      )}
    </span>
  );
}

import type { CSSProperties } from "react";
import type { IconType } from "react-icons";
import { FaLinkedinIn } from "react-icons/fa6";
import {
  SiAppstore,
  SiBluesky,
  SiFacebook,
  SiGoogle,
  SiInstagram,
  SiPinterest,
  SiTelegram,
  SiThreads,
  SiTiktok,
  SiWhatsapp,
  SiX,
  SiYoutube,
  SiZalo,
} from "react-icons/si";

import { getPlatform, type PlatformSlug } from "@/shared/config/platforms";
import { cn } from "@/shared/lib/utils";

/** Official brand marks (Simple Icons; LinkedIn from Font Awesome Brands). */
const LOGOS: Record<PlatformSlug, IconType> = {
  facebook: SiFacebook,
  instagram: SiInstagram,
  threads: SiThreads,
  tiktok: SiTiktok,
  youtube: SiYoutube,
  linkedin: FaLinkedinIn,
  twitter: SiX,
  pinterest: SiPinterest,
  google: SiGoogle,
  zalo: SiZalo,
  whatsapp: SiWhatsapp,
  telegram: SiTelegram,
  bluesky: SiBluesky,
  app_store_connect: SiAppstore,
};

/** Instagram's tile uses its gradient instead of a flat colour. */
const BACKGROUNDS: Partial<Record<PlatformSlug, string>> = {
  instagram:
    "linear-gradient(45deg, #FEDA75 0%, #FA7E1E 25%, #D62976 50%, #962FBF 75%, #4F5BD5 100%)",
};

const SIZES = {
  sm: "size-5 rounded-md",
  md: "size-8 rounded-lg",
  lg: "size-11 rounded-xl",
};

/*
 * The logo carries its own size + colour classes on purpose: shadcn menus/selects style
 * "any svg without a size-/text- class" (muted colour, size-4), which would grey out and
 * resize brand logos. Callers can still override via `[&_svg]:size-…` on className.
 */
const LOGO_SIZES = {
  sm: "size-3",
  md: "size-4",
  lg: "size-6",
};

/** Platform logo on its brand-coloured tile. */
export function PlatformIcon({
  platform,
  size = "md",
  className,
}: {
  platform: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const config = getPlatform(platform);
  const Logo = config ? LOGOS[config.slug] : undefined;
  const style: CSSProperties = {
    background: (config && BACKGROUNDS[config.slug]) ?? config?.color ?? "#71717a",
  };

  return (
    <span
      title={config?.label ?? platform}
      className={cn(
        "inline-flex shrink-0 items-center justify-center text-[10px] font-bold text-white shadow-sm",
        SIZES[size],
        className,
      )}
      style={style}
    >
      {Logo ? (
        <Logo aria-hidden className={cn("text-white", LOGO_SIZES[size])} />
      ) : (
        platform.slice(0, 2).toUpperCase()
      )}
    </span>
  );
}

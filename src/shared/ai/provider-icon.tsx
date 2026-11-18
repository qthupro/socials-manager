import type { IconType } from "react-icons";
import { RiOpenaiFill } from "react-icons/ri";
import { SiClaude, SiDeepseek, SiGooglegemini } from "react-icons/si";

import { cn } from "@/shared/lib/utils";

import type { AiProviderId } from "./config";

const ICONS: Record<AiProviderId, { icon: IconType; color: string }> = {
  claude: { icon: SiClaude, color: "#D97757" },
  openai: { icon: RiOpenaiFill, color: "currentColor" },
  gemini: { icon: SiGooglegemini, color: "#4285F4" },
  deepseek: { icon: SiDeepseek, color: "#4D6BFE" },
};

/** Provider logo (brand colour; ChatGPT follows the text colour). */
export function AiProviderIcon({ id, className }: { id: AiProviderId; className?: string }) {
  const { icon: Icon, color } = ICONS[id];
  return <Icon aria-hidden className={cn("size-5 shrink-0", className)} style={{ color }} />;
}

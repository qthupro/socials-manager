import { Bot, UserRound } from "lucide-react";

import { cn } from "@/shared/lib/utils";

import { useResponders } from "../store/responders-store";

/**
 * Tiny icon chip: who has answered this conversation — the AI bot, a person, or both.
 * Nothing when nobody has replied yet.
 */
export function ResponderBadge({ conversationId }: { conversationId: string }) {
  const r = useResponders((s) => s.byConversation[conversationId]);
  if (!r?.bot && !r?.human) return null;

  const label =
    r.bot && r.human
      ? "AI và nhân viên cùng xử lý"
      : r.bot
        ? "AI đã trả lời"
        : "Nhân viên đã trả lời";

  return (
    <span
      title={label}
      aria-label={label}
      className={cn(
        "inline-flex h-4 shrink-0 items-center gap-0.5 rounded-full border bg-background px-1",
        r.bot && r.human && "pr-1.5",
      )}
    >
      {r.bot && <Bot className="size-3 text-sky-600 dark:text-sky-400" />}
      {r.human && <UserRound className="size-3 text-emerald-600 dark:text-emerald-400" />}
    </span>
  );
}

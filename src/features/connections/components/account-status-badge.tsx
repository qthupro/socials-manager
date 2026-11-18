import { cn } from "@/shared/lib/utils";

import type { AccountStatus } from "../api/types";

const STATUS: Record<string, { label: string; className: string }> = {
  active: { label: "Hoạt động", className: "bg-green-500/10 text-green-700 dark:text-green-400" },
  reconnect_recommended: {
    label: "Nên kết nối lại",
    className: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  token_expired: {
    label: "Cần kết nối lại",
    className: "bg-red-500/10 text-red-700 dark:text-red-400",
  },
  reconnect_required: {
    label: "Cần kết nối lại",
    className: "bg-red-500/10 text-red-700 dark:text-red-400",
  },
};

export function AccountStatusBadge({ status }: { status: AccountStatus }) {
  // Unknown statuses are treated as "needs reconnect", per the docs.
  const s = STATUS[status] ?? STATUS.token_expired;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        s.className,
      )}
    >
      {s.label}
    </span>
  );
}

import type { ColumnDef } from "@/shared/components/data-table";
import { PlatformIcon } from "@/shared/components/platform-icon";
import { getPlatform } from "@/shared/config/platforms";

import type { SocialAccount } from "../api/types";
import { needsReconnect, reconnectReasonLabel } from "../lib/account-status";
import { AccountActions } from "./account-actions";
import { AccountStatusBadge } from "./account-status-badge";

interface AccountColumnsOptions {
  /** Include the brand column (id → name). */
  brandNames?: Map<string, string>;
  /** Include reconnect / disconnect / Page actions. Default true; false for read-only views. */
  actions?: boolean;
}

/** Column set for account tables. */
export function getAccountColumns({
  brandNames,
  actions = true,
}: AccountColumnsOptions = {}): ColumnDef<SocialAccount>[] {
  const columns: ColumnDef<SocialAccount>[] = [
    {
      id: "account",
      header: "Tài khoản",
      cell: ({ row: { original: a } }) => {
        const handle = a.username && a.username !== a.name ? a.username : undefined;
        return (
          <div className="flex min-w-0 items-center gap-3">
            {a.profile_picture_url ? (
              <img
                src={a.profile_picture_url}
                alt=""
                className="size-8 shrink-0 rounded-full bg-muted object-cover"
              />
            ) : (
              <PlatformIcon platform={a.platform} className="rounded-full" />
            )}
            <div className="min-w-0">
              <p className="truncate font-medium">{a.page_name ?? a.name}</p>
              {handle && (
                <p className="truncate text-xs text-muted-foreground">
                  @{handle.replace(/^@/, "")}
                </p>
              )}
            </div>
          </div>
        );
      },
    },
    {
      id: "platform",
      header: "Kênh",
      cell: ({ row: { original: a } }) => {
        const p = getPlatform(a.platform);
        return (
          <div className="flex items-center gap-2">
            <PlatformIcon platform={a.platform} size="sm" />
            <span>{p?.label ?? a.platform}</span>
            {a.connection_type && (
              <span className="text-xs text-muted-foreground">
                {a.connection_type === "organization" ? "Page" : "Hồ sơ"}
              </span>
            )}
          </div>
        );
      },
    },
  ];

  if (brandNames) {
    columns.push({
      id: "brand",
      header: "Thương hiệu",
      cell: ({ row: { original: a } }) => (
        <span className="text-muted-foreground">{brandNames.get(a.brand_id) ?? "—"}</span>
      ),
    });
  }

  columns.push({
    id: "status",
    header: "Trạng thái",
    cell: ({ row: { original: a } }) => {
      const reason = needsReconnect(a.status)
        ? reconnectReasonLabel(a.reconnect_reason)
        : undefined;
      return (
        <div className="max-w-56">
          <AccountStatusBadge status={a.status} />
          {reason && (
            <p
              className="mt-0.5 truncate text-xs text-amber-700 dark:text-amber-400"
              title={reason}
            >
              {reason}
            </p>
          )}
        </div>
      );
    },
  });

  if (actions) {
    columns.push({
      id: "actions",
      header: () => <span className="sr-only">Thao tác</span>,
      cell: ({ row: { original: a } }) => <AccountActions account={a} />,
    });
  }

  return columns;
}

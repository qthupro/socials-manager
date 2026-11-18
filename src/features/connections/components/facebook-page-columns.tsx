import { ExternalLink } from "lucide-react";

import type { ColumnDef } from "@/shared/components/data-table";
import { Button } from "@/shared/components/ui/button";
import { openExternal } from "@/shared/platform/opener";

import type { AccountPage, LoginPage } from "../api/facebook-pages";
import {
  AssignPageCell,
  PageActiveCell,
  PageDefaultCell,
  PageIdentity,
} from "./facebook-page-cells";

/** Pages held by the account. */
export function getAccountPageColumns(accountId: string): ColumnDef<AccountPage>[] {
  return [
    {
      id: "page",
      header: "Page",
      cell: ({ row: { original: p } }) => (
        <PageIdentity
          name={p.name}
          picture={p.profile_picture_url}
          sub={p.username ? `@${p.username}` : undefined}
        />
      ),
    },
    {
      id: "category",
      header: "Danh mục",
      cell: ({ row: { original: p } }) => (
        <span className="text-muted-foreground">{p.category ?? "—"}</span>
      ),
    },
    {
      id: "followers",
      header: "Người theo dõi",
      cell: ({ row: { original: p } }) => (
        <span className="tabular-nums">
          {p.followers_count !== undefined ? p.followers_count.toLocaleString("vi-VN") : "—"}
        </span>
      ),
    },
    {
      id: "default",
      header: "Mặc định",
      cell: ({ row: { original: p } }) => <PageDefaultCell accountId={accountId} page={p} />,
    },
    {
      id: "active",
      header: "Trạng thái",
      cell: ({ row: { original: p } }) => <PageActiveCell accountId={accountId} page={p} />,
    },
    {
      id: "open",
      header: () => <span className="sr-only">Mở</span>,
      cell: ({ row: { original: p } }) =>
        p.link ? (
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="icon-sm"
              title="Mở Page trên Facebook"
              aria-label="Mở Page trên Facebook"
              onClick={() => openExternal(p.link!)}
            >
              <ExternalLink />
            </Button>
          </div>
        ) : null,
    },
  ];
}

/** Other Pages of the same Facebook login. */
export function getLoginPageColumns(loginId: string, brandId: string): ColumnDef<LoginPage>[] {
  return [
    {
      id: "page",
      header: "Page",
      cell: ({ row: { original: p } }) => <PageIdentity name={p.name} picture={p.picture_url} />,
    },
    {
      id: "category",
      header: "Danh mục",
      cell: ({ row: { original: p } }) => (
        <span className="text-muted-foreground">{p.category ?? "—"}</span>
      ),
    },
    {
      id: "brand",
      header: "Đang thuộc thương hiệu",
      cell: ({ row: { original: p } }) =>
        p.assignable ? (
          <span className="text-muted-foreground">Chưa thuộc thương hiệu nào</span>
        ) : (
          <span>{p.assigned_brand_name ?? "Thương hiệu khác"}</span>
        ),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Thao tác</span>,
      cell: ({ row: { original: p } }) => (
        <AssignPageCell loginId={loginId} brandId={brandId} page={p} />
      ),
    },
  ];
}

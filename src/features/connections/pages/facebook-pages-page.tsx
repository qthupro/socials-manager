import { ArrowLeft, Flag, Info, Power, PowerOff } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router";
import { toast } from "sonner";

import { getErrorMessage, useMe } from "@/shared/api";
import { DataTable, type RowSelectionState } from "@/shared/components/data-table";
import { PageHeader } from "@/shared/components/page-header";
import { PlatformIcon } from "@/shared/components/platform-icon";
import { EmptyState, ErrorState, RequireApiKey } from "@/shared/components/state-views";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { facebookPageCap } from "@/shared/config/plans";
import { getPlatform } from "@/shared/config/platforms";

import { useAccounts } from "../api/accounts";
import { useBrands } from "../api/brands";
import { useAccountPages, useLoginPages, useUpdatePage } from "../api/facebook-pages";
import { AccountStatusBadge } from "../components/account-status-badge";
import { getAccountPageColumns, getLoginPageColumns } from "../components/facebook-page-columns";

function Section({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="font-medium">{title}</h3>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

function FacebookPagesContent({ accountId }: { accountId: string }) {
  const accounts = useAccounts();
  const brands = useBrands();
  const me = useMe();

  const account = accounts.data?.find((a) => a.id === accountId);
  const isFacebook = getPlatform(account?.platform ?? "")?.slug === "facebook";
  const pages = useAccountPages(accountId, isFacebook);
  const loginPages = useLoginPages(account?.login_id, isFacebook);
  const update = useUpdatePage(accountId);
  const [selection, setSelection] = useState<RowSelectionState>({});

  const pageColumns = useMemo(() => getAccountPageColumns(accountId), [accountId]);
  const loginColumns = useMemo(
    () => getLoginPageColumns(account?.login_id ?? "", account?.brand_id ?? ""),
    [account?.login_id, account?.brand_id],
  );

  if (accounts.isLoading) return <Skeleton className="h-40 rounded-xl" />;
  if (accounts.error)
    return <ErrorState error={accounts.error} onRetry={() => accounts.refetch()} />;
  if (!account || !isFacebook) {
    return (
      <EmptyState
        icon={Flag}
        title="Không tìm thấy tài khoản Facebook"
        action={
          <Button asChild size="sm" variant="outline">
            <Link to="/accounts">Về danh sách tài khoản</Link>
          </Button>
        }
      />
    );
  }

  const brandName = brands.data?.find((b) => b.id === account.brand_id)?.name;
  const held = pages.data ?? [];
  const heldIds = new Set(held.map((p) => p.platform_page_id));
  // Pages of the same Facebook login that this account doesn't hold yet.
  const others = (loginPages.data ?? []).filter((p) => !heldIds.has(p.platform_page_id));
  const activeCount = held.filter((p) => p.is_active).length;
  const cap = me.data?.facebook_page_selection ? facebookPageCap(me.data.plan) : null;
  const selected = held.filter((p) => selection[p.id]);

  const setActiveForSelected = async (active: boolean) => {
    const targets = selected.filter((p) => p.is_active !== active);
    // Sequential: activating can hit the plan's Page cap part-way through.
    let ok = 0;
    for (const p of targets) {
      try {
        await update.mutateAsync({ pageId: p.id, is_active: active });
        ok++;
      } catch (err) {
        toast.error(`${p.name}: ${getErrorMessage(err)}`);
        break;
      }
    }
    if (ok > 0) toast.success(`Đã ${active ? "bật" : "tắt"} ${ok} Page`);
    setSelection({});
  };

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Link
          to="/accounts"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Tài khoản
        </Link>
        <PageHeader
          title={
            <span className="flex items-center gap-3">
              <PlatformIcon platform="facebook" />
              {account.name}
            </span>
          }
          description={
            <span className="flex flex-wrap items-center gap-2">
              Quản lý Facebook Page{brandName && <> · Thương hiệu: {brandName}</>}
              <AccountStatusBadge status={account.status} />
            </span>
          }
          actions={
            cap !== null && cap !== undefined ? (
              <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                {activeCount} / {cap} Page đang hoạt động
              </span>
            ) : undefined
          }
        />
      </div>

      <Section
        title="Page trong thương hiệu"
        description="Page đang bật dùng được để đăng bài và nhận tin nhắn. Page mặc định được dùng khi không chỉ định Page."
        actions={
          selected.length > 0 && (
            <>
              <Button
                size="sm"
                variant="outline"
                disabled={update.isPending}
                onClick={() => setActiveForSelected(true)}
              >
                <Power /> Bật ({selected.length})
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={update.isPending}
                onClick={() => setActiveForSelected(false)}
              >
                <PowerOff /> Tắt ({selected.length})
              </Button>
            </>
          )
        }
      >
        {pages.error ? (
          <ErrorState error={pages.error} onRetry={() => pages.refetch()} />
        ) : (
          <DataTable
            columns={pageColumns}
            data={held}
            getRowId={(p) => p.id}
            rowSelection={selection}
            onRowSelectionChange={setSelection}
            loading={pages.isLoading}
            pageSize={10}
            empty="Tài khoản chưa có Page nào."
          />
        )}
      </Section>

      {account.login_id && (
        <Section
          title="Page khác từ tài khoản Facebook này"
          description="Thêm Page vào thương hiệu, hoặc chuyển Page đang thuộc thương hiệu khác về đây."
        >
          {loginPages.error ? (
            <ErrorState error={loginPages.error} onRetry={() => loginPages.refetch()} />
          ) : (
            <DataTable
              columns={loginColumns}
              data={others}
              getRowId={(p) => p.platform_page_id}
              selectable={false}
              loading={loginPages.isLoading}
              pageSize={10}
              empty="Không còn Page nào khác. Muốn thêm Page mới, hãy kết nối lại và cấp quyền cho Page đó trên Facebook."
            />
          )}
        </Section>
      )}

      <div className="flex gap-2 rounded-lg bg-muted/60 p-3 text-sm text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0" />
        <span>
          SocialAPI không hỗ trợ xoá hay đổi tên từng Page. Tắt Page để ngừng dùng Page đó (Page đã
          tắt không tính vào giới hạn của gói). Muốn gỡ toàn bộ, hãy ngắt kết nối tài khoản Facebook
          ở trang Tài khoản.
        </span>
      </div>
    </div>
  );
}

export function FacebookPagesPage() {
  const { accountId = "" } = useParams();
  return (
    <RequireApiKey>
      <FacebookPagesContent accountId={accountId} />
    </RequireApiKey>
  );
}

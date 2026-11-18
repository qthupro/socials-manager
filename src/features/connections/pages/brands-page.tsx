import { Building2, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

import { useUsage } from "@/shared/api";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { PageHeader } from "@/shared/components/page-header";
import { PlatformIcon } from "@/shared/components/platform-icon";
import { EmptyState, ErrorState, RequireApiKey } from "@/shared/components/state-views";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";

import { useAccounts } from "../api/accounts";
import { useBrands, useDeleteBrand } from "../api/brands";
import type { Brand, SocialAccount } from "../api/types";
import { BrandFormDialog } from "../components/brand-form-dialog";

function BrandCard({ brand, accounts }: { brand: Brand; accounts: SocialAccount[] }) {
  const remove = useDeleteBrand();

  return (
    <div className="group relative flex flex-col gap-4 rounded-xl border bg-card p-4 transition-colors hover:border-primary/50 hover:shadow-sm">
      {/* Whole card links to the detail page; action buttons sit above the link. */}
      <Link
        to={`/brands/${brand.id}`}
        className="absolute inset-0 rounded-xl"
        aria-label={brand.name}
      />

      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Building2 className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{brand.name}</p>
          <p className="text-sm text-muted-foreground">{brand.accounts_count} tài khoản</p>
        </div>
        <div className="relative z-10 flex opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <BrandFormDialog
            brand={brand}
            trigger={
              <Button variant="ghost" size="icon-sm" aria-label="Đổi tên">
                <Pencil />
              </Button>
            }
          />
          <ConfirmDialog
            trigger={
              <Button variant="ghost" size="icon-sm" aria-label="Xoá" className="text-destructive">
                <Trash2 />
              </Button>
            }
            title={`Xoá "${brand.name}"?`}
            description="Mọi tài khoản trong thương hiệu sẽ bị ngắt kết nối."
            confirmLabel="Xoá thương hiệu"
            onConfirm={async () => {
              await remove.mutateAsync(brand.id);
              toast.success(`Đã xoá "${brand.name}"`);
            }}
          />
        </div>
      </div>

      <div className="flex min-h-5 flex-wrap gap-1">
        {accounts.length === 0 ? (
          <span className="text-xs text-muted-foreground">Chưa kết nối nền tảng nào</span>
        ) : (
          accounts.map((a) => <PlatformIcon key={a.id} platform={a.platform} size="sm" />)
        )}
      </div>
    </div>
  );
}

function BrandsContent() {
  const brands = useBrands();
  const accounts = useAccounts();
  const usage = useUsage();

  const byBrand = useMemo(() => {
    const map = new Map<string, SocialAccount[]>();
    for (const a of accounts.data ?? []) map.set(a.brand_id, [...(map.get(a.brand_id) ?? []), a]);
    return map;
  }, [accounts.data]);

  const limit = usage.data?.brands_limit;
  const used = usage.data?.brands_used ?? brands.data?.length ?? 0;
  const atLimit = limit !== undefined && limit !== -1 && used >= limit;

  const createButton = (
    <Button size="sm" disabled={atLimit} title={atLimit ? "Đã đạt giới hạn của gói" : undefined}>
      <Plus /> Tạo thương hiệu
    </Button>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Thương hiệu"
        description="Mỗi thương hiệu giữ 1 tài khoản cho mỗi nền tảng (riêng LinkedIn được nhiều)."
        actions={
          <>
            {usage.data && (
              <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                {used} / {limit === -1 ? "∞" : limit} thương hiệu
              </span>
            )}
            <BrandFormDialog trigger={createButton} />
          </>
        }
      />

      {brands.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : brands.error ? (
        <ErrorState error={brands.error} onRetry={() => brands.refetch()} />
      ) : brands.data?.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Chưa có thương hiệu"
          description="Tạo thương hiệu đầu tiên để kết nối tài khoản mạng xã hội."
          action={<BrandFormDialog trigger={createButton} />}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {brands.data?.map((b) => (
            <BrandCard key={b.id} brand={b} accounts={byBrand.get(b.id) ?? []} />
          ))}
        </div>
      )}
    </div>
  );
}

export function BrandsPage() {
  return (
    <RequireApiKey>
      <BrandsContent />
    </RequireApiKey>
  );
}

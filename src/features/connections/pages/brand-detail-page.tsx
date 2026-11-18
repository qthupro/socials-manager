import { ArrowLeft, Pencil, Plug, Trash2, Unplug } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";

import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { DataTable } from "@/shared/components/data-table";
import { PageHeader } from "@/shared/components/page-header";
import { EmptyState, ErrorState, RequireApiKey } from "@/shared/components/state-views";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";

import { useAccounts } from "../api/accounts";
import { useBrands, useDeleteBrand } from "../api/brands";
import { getAccountColumns } from "../components/account-columns";
import { BrandFormDialog } from "../components/brand-form-dialog";

// Read-only view: brand is implied, and connections are managed on the Accounts page.
const columns = getAccountColumns({ actions: false });

function BrandDetailContent({ brandId }: { brandId: string }) {
  const navigate = useNavigate();
  const brands = useBrands();
  const accounts = useAccounts(brandId);
  const remove = useDeleteBrand();

  const brand = brands.data?.find((b) => b.id === brandId);

  if (brands.isLoading) return <Skeleton className="h-40 rounded-xl" />;
  if (brands.error) return <ErrorState error={brands.error} onRetry={() => brands.refetch()} />;
  if (!brand) {
    return (
      <EmptyState
        icon={Unplug}
        title="Không tìm thấy thương hiệu"
        action={
          <Button asChild size="sm" variant="outline">
            <Link to="/brands">Về danh sách</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Link
          to="/brands"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Thương hiệu
        </Link>
        <PageHeader
          title={brand.name}
          description={`${brand.accounts_count} tài khoản đã kết nối`}
          actions={
            <>
              <BrandFormDialog
                brand={brand}
                trigger={
                  <Button variant="outline" size="sm">
                    <Pencil /> Đổi tên
                  </Button>
                }
              />
              <ConfirmDialog
                trigger={
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 /> Xoá
                  </Button>
                }
                title={`Xoá "${brand.name}"?`}
                description="Mọi tài khoản trong thương hiệu sẽ bị ngắt kết nối."
                confirmLabel="Xoá thương hiệu"
                onConfirm={async () => {
                  await remove.mutateAsync(brand.id);
                  toast.success(`Đã xoá "${brand.name}"`);
                  navigate("/brands");
                }}
              />
            </>
          }
        />
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h3 className="font-medium">Tài khoản trong thương hiệu</h3>
          <Button asChild size="sm" variant="outline">
            <Link to={`/accounts?brand=${encodeURIComponent(brand.id)}`}>
              <Plug /> Quản lý kết nối
            </Link>
          </Button>
        </div>
        {accounts.error ? (
          <ErrorState error={accounts.error} onRetry={() => accounts.refetch()} />
        ) : (
          <DataTable
            columns={columns}
            data={accounts.data ?? []}
            getRowId={(a) => a.id}
            selectable={false}
            loading={accounts.isLoading}
            pageSize={10}
            empty="Chưa có tài khoản nào. Kết nối tài khoản ở trang Tài khoản."
          />
        )}
      </section>
    </div>
  );
}

export function BrandDetailPage() {
  const { brandId = "" } = useParams();
  return (
    <RequireApiKey>
      <BrandDetailContent brandId={brandId} />
    </RequireApiKey>
  );
}

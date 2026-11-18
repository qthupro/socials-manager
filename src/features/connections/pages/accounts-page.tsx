import {
  Building2,
  Plug,
  Plus,
  Search,
  TriangleAlert,
  Unplug,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { toast } from "sonner";

import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { DataTable, type RowSelectionState } from "@/shared/components/data-table";
import { PageHeader } from "@/shared/components/page-header";
import { PlatformIcon } from "@/shared/components/platform-icon";
import { EmptyState, ErrorState, RequireApiKey } from "@/shared/components/state-views";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { getPlatform, PLATFORMS } from "@/shared/config/platforms";
import { cn } from "@/shared/lib/utils";

import { useAccounts, useDisconnectAccount } from "../api/accounts";
import { useBrands } from "../api/brands";
import { getAccountColumns } from "../components/account-columns";
import { ConnectDialog } from "../components/connect-dialog";
import { needsReconnect } from "../lib/account-status";

type StatusFilter = "all" | "attention" | "active";
const ALL = "all";

const platformOrder = (platform: string) =>
  PLATFORMS.findIndex((p) => p.slug === getPlatform(platform)?.slug);

/** Solid, cool-toned backgrounds for the overview cards. */
const STAT_COLORS = {
  blue: "bg-blue-600",
  indigo: "bg-indigo-600",
  teal: "bg-teal-600",
};

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  active,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  color: keyof typeof STAT_COLORS;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        "flex items-center gap-4 rounded-xl p-5 text-left text-white shadow-sm transition-[filter,box-shadow] enabled:hover:brightness-110",
        STAT_COLORS[color],
        active && "shadow-lg ring-2 ring-sky-300 ring-offset-2 ring-offset-background",
      )}
    >
      <div className="flex size-11 items-center justify-center rounded-lg bg-white/15">
        <Icon className="size-5" />
      </div>
      <div>
        <p className="text-3xl font-semibold tabular-nums">{value}</p>
        <p className="text-sm text-white/80">{label}</p>
      </div>
    </button>
  );
}

function AccountsContent() {
  const accounts = useAccounts();
  const brands = useBrands();
  const disconnect = useDisconnectAccount();

  // `?brand=<id>` (e.g. from a brand's detail page) preselects the brand filter.
  const [searchParams] = useSearchParams();
  const [brandId, setBrandId] = useState(() => searchParams.get("brand") ?? ALL);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [platform, setPlatform] = useState(ALL);
  const [selection, setSelection] = useState<RowSelectionState>({});

  const all = useMemo(() => accounts.data ?? [], [accounts.data]);
  const brandNames = useMemo(
    () => new Map((brands.data ?? []).map((b) => [b.id, b.name])),
    [brands.data],
  );
  const columns = useMemo(
    // Brand column only when looking at every brand.
    () => getAccountColumns({ brandNames: brandId === ALL ? brandNames : undefined }),
    [brandId, brandNames],
  );

  const filtering = brandId !== ALL || query.trim() !== "" || status !== "all" || platform !== ALL;
  const attentionCount = all.filter((a) => needsReconnect(a.status)).length;

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (
      all
        .filter(
          (a) =>
            (brandId === ALL || a.brand_id === brandId) &&
            (status === "all" || (status === "attention") === needsReconnect(a.status)) &&
            (platform === ALL || getPlatform(a.platform)?.slug === platform) &&
            (!q ||
              a.name.toLowerCase().includes(q) ||
              a.username.toLowerCase().includes(q) ||
              (a.page_name ?? "").toLowerCase().includes(q)),
        )
        // Problems first, then brand, then platform order.
        .sort(
          (a, b) =>
            Number(needsReconnect(b.status)) - Number(needsReconnect(a.status)) ||
            (brandNames.get(a.brand_id) ?? "").localeCompare(brandNames.get(b.brand_id) ?? "") ||
            platformOrder(a.platform) - platformOrder(b.platform),
        )
    );
  }, [all, brandId, query, status, platform, brandNames]);

  // Only act on selected rows that are still visible under the current filters.
  const selectedIds = rows.filter((a) => selection[a.id]).map((a) => a.id);

  const resetFilters = () => {
    setBrandId(ALL);
    setStatus("all");
    setPlatform(ALL);
    setQuery("");
  };

  const disconnectSelected = async () => {
    const results = await Promise.allSettled(selectedIds.map((id) => disconnect.mutateAsync(id)));
    const failed = results.filter((r) => r.status === "rejected").length;
    const ok = results.length - failed;
    if (ok > 0) toast.success(`Đã ngắt kết nối ${ok} tài khoản`);
    if (failed > 0) toast.error(`${failed} tài khoản ngắt kết nối thất bại`);
    setSelection({});
  };

  const loading = accounts.isLoading || brands.isLoading;
  const error = accounts.error ?? brands.error;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tài khoản"
        description="Quản lý kết nối các kênh mạng xã hội."
        actions={
          <ConnectDialog
            brandId={brandId === ALL ? undefined : brandId}
            trigger={
              <Button size="sm">
                <Plus /> Kết nối tài khoản
              </Button>
            }
          />
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          icon={Building2}
          label="Thương hiệu"
          value={brands.data?.length ?? 0}
          color="blue"
        />
        <StatCard
          icon={Users}
          label="Tài khoản đã kết nối"
          value={all.length}
          color="indigo"
          active={!filtering}
          onClick={resetFilters}
        />
        <StatCard
          icon={TriangleAlert}
          label="Cần kết nối lại"
          value={attentionCount}
          color="teal"
          active={status === "attention"}
          onClick={() => setStatus(status === "attention" ? "all" : "attention")}
        />
      </div>

      {error ? (
        <ErrorState
          error={error}
          onRetry={() => {
            accounts.refetch();
            brands.refetch();
          }}
        />
      ) : !loading && brands.data?.length === 0 ? (
        <EmptyState
          icon={Plug}
          title="Chưa có thương hiệu nào"
          description="Tạo một thương hiệu trong mục Thương hiệu, sau đó kết nối tài khoản vào đó."
        />
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={brandId} onValueChange={setBrandId}>
              <SelectTrigger className="w-56">
                <Building2 className="text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tất cả thương hiệu</SelectItem>
                {brands.data?.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative min-w-60 flex-1">
              <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Tìm theo tên, username, Page…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Mọi kênh</SelectItem>
                {PLATFORMS.map((p) => (
                  <SelectItem key={p.slug} value={p.slug}>
                    <PlatformIcon platform={p.slug} size="sm" /> {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Mọi trạng thái</SelectItem>
                <SelectItem value="active">Hoạt động</SelectItem>
                <SelectItem value="attention">Cần kết nối lại</SelectItem>
              </SelectContent>
            </Select>

            {filtering && (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                Xoá lọc
              </Button>
            )}

            {selectedIds.length > 0 && (
              <ConfirmDialog
                trigger={
                  <Button variant="destructive" size="sm" className="ml-auto">
                    <Unplug /> Ngắt kết nối ({selectedIds.length})
                  </Button>
                }
                title={`Ngắt kết nối ${selectedIds.length} tài khoản?`}
                description="Không thể hoàn tác. Dữ liệu đã lưu của các tài khoản này sẽ bị xoá."
                confirmLabel="Ngắt kết nối"
                onConfirm={disconnectSelected}
              />
            )}
          </div>

          <DataTable
            columns={columns}
            data={rows}
            getRowId={(a) => a.id}
            rowSelection={selection}
            onRowSelectionChange={setSelection}
            loading={loading}
            empty={
              all.length === 0
                ? "Chưa có tài khoản nào. Bấm “Kết nối tài khoản” để bắt đầu."
                : "Không có tài khoản phù hợp với bộ lọc."
            }
          />
        </div>
      )}
    </div>
  );
}

export function AccountsPage() {
  return (
    <RequireApiKey>
      <AccountsContent />
    </RequireApiKey>
  );
}

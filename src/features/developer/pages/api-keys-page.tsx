import {
  Ban,
  KeyRound,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCw,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

import { useBrands } from "@/features/connections";
import { ApiError, useApiKey } from "@/shared/api";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { PageHeader } from "@/shared/components/page-header";
import { EmptyState, ErrorState, RequireApiKey } from "@/shared/components/state-views";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Switch } from "@/shared/components/ui/switch";
import { cn } from "@/shared/lib/utils";

import { useApiKeys, useRevokeKey, useRotateKey } from "../api/keys";
import type { ApiKeyItem, IssuedKey } from "../api/types";
import { KeyFormDialog } from "../components/key-form-dialog";
import { SecretRevealDialog } from "../components/secret-reveal-dialog";
import { StatusPill } from "../components/status-pill";
import { dateTime, timeAgo } from "../lib/format";

/** preview = "sapi_key_" + first 5 chars + "..." — enough to recognise this app's key. */
const matchesPreview = (preview: string, raw: string) => {
  const prefix = preview.replace(/\.+$/, "");
  return prefix.length > "sapi_key_".length && raw.startsWith(prefix);
};

type Action = { kind: "edit" | "rotate" | "revoke"; key: ApiKeyItem } | null;

function KeyRow({
  item,
  isCurrent,
  brandName,
  onAction,
}: {
  item: ApiKeyItem;
  isCurrent: boolean;
  brandName: (id: string) => string;
  onAction: (a: Action) => void;
}) {
  const scopes = item.scopes ?? [];
  const brands = item.brand_ids ?? [];
  const full = scopes.length === 0 && brands.length === 0;

  return (
    <tr className={cn("border-t", !item.is_active && "text-muted-foreground")}>
      <td className="px-4 py-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-medium">{item.name}</span>
          {isCurrent && <StatusPill tone="ok">App đang dùng</StatusPill>}
          {!item.is_active && <StatusPill tone="muted">Đã thu hồi</StatusPill>}
        </div>
        <code className="font-mono text-xs text-muted-foreground">{item.preview}</code>
      </td>
      <td className="px-4 py-3">
        {full ? (
          <span className="flex items-center gap-1 text-xs">
            <ShieldAlert className="size-3.5 text-amber-600" /> Toàn quyền
          </span>
        ) : (
          <div className="space-y-1">
            {scopes.length === 0 ? (
              <span className="text-xs">Mọi quyền</span>
            ) : (
              <div className="flex max-w-72 flex-wrap gap-1">
                {scopes.map((s) => (
                  <code key={s} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">
                    {s}
                  </code>
                ))}
              </div>
            )}
          </div>
        )}
      </td>
      <td className="px-4 py-3 text-xs">
        {brands.length === 0 ? (
          "Tất cả"
        ) : (
          <span className="flex items-center gap-1">
            <ShieldCheck className="size-3.5 text-green-600" />
            {brands.map(brandName).join(", ")}
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-xs tabular-nums">
        {item.last_used_at ? (
          <span title={dateTime.format(new Date(item.last_used_at))}>
            {timeAgo(item.last_used_at)}
          </span>
        ) : (
          <span className="text-muted-foreground">Chưa dùng</span>
        )}
      </td>
      <td className="px-4 py-3 text-xs tabular-nums">
        {dateTime.format(new Date(item.created_at))}
      </td>
      <td className="px-4 py-3 text-right">
        {item.is_active && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Thao tác">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => onAction({ kind: "edit", key: item })}>
                <Pencil /> Sửa tên & quyền
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onAction({ kind: "rotate", key: item })}>
                <RotateCw /> Xoay vòng (cấp key mới)
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => onAction({ kind: "revoke", key: item })}
              >
                <Ban /> Thu hồi
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </td>
    </tr>
  );
}

function ApiKeysContent() {
  const keys = useApiKeys();
  const brands = useBrands();
  const rotate = useRotateKey();
  const revoke = useRevokeKey();
  const currentRaw = useApiKey((s) => s.apiKey);
  const setApiKey = useApiKey((s) => s.setApiKey);
  const [showRevoked, setShowRevoked] = useState(false);
  const [action, setAction] = useState<Action>(null);
  const [issued, setIssued] = useState<{ key: IssuedKey; appUpdated: boolean } | null>(null);

  const all = keys.data ?? [];
  const list = showRevoked ? all : all.filter((k) => k.is_active);
  const revokedCount = all.length - all.filter((k) => k.is_active).length;
  const brandList = brands.data ?? [];
  const brandName = (id: string) => brandList.find((b) => b.id === id)?.name ?? id.slice(0, 8);
  const isCurrent = (k: ApiKeyItem) => k.is_active && matchesPreview(k.preview, currentRaw);
  const target = action?.key;
  const targetIsCurrent = !!target && isCurrent(target);

  const createButton = (
    <KeyFormDialog
      brands={brandList}
      onIssued={(key) => setIssued({ key, appUpdated: false })}
      trigger={
        <Button size="sm">
          <Plus /> Tạo API key
        </Button>
      }
    />
  );

  // Key management needs a full-access key; a scoped key gets 403 insufficient_scope.
  const scopedKey = keys.error instanceof ApiError && keys.error.code === "auth.insufficient_scope";

  return (
    <div className="space-y-5">
      <PageHeader
        title="API Keys"
        description="Tạo, giới hạn quyền, xoay vòng và thu hồi khoá truy cập SocialAPI."
        actions={!scopedKey && createButton}
      />

      {scopedKey ? (
        <EmptyState
          icon={ShieldAlert}
          title="Key hiện tại bị giới hạn quyền"
          description="Quản lý API key cần một key toàn quyền (không giới hạn scope hay thương hiệu). Đổi sang key toàn quyền trong Cài đặt, hoặc quản lý key trên dashboard SocialAPI."
          action={
            <Button asChild size="sm" variant="outline">
              <Link to="/settings">Đến Cài đặt</Link>
            </Button>
          }
        />
      ) : keys.error ? (
        <ErrorState error={keys.error} onRetry={() => keys.refetch()} />
      ) : keys.isLoading ? (
        <Skeleton className="h-56 rounded-xl" />
      ) : list.length === 0 ? (
        <EmptyState
          icon={KeyRound}
          title="Chưa có API key nào"
          description="Tạo key riêng cho từng dịch vụ hoặc AI agent, chỉ cấp những quyền cần dùng."
          action={createButton}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">Tên / key</th>
                <th className="px-4 py-2.5 text-left font-medium">Quyền</th>
                <th className="px-4 py-2.5 text-left font-medium">Thương hiệu</th>
                <th className="px-4 py-2.5 text-left font-medium">Dùng lần cuối</th>
                <th className="px-4 py-2.5 text-left font-medium">Tạo lúc</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {list.map((k) => (
                <KeyRow
                  key={k.id}
                  item={k}
                  isCurrent={isCurrent(k)}
                  brandName={brandName}
                  onAction={setAction}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!scopedKey && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-2xl text-xs text-muted-foreground">
            Key toàn quyền tạo được key khác (kể cả key toàn quyền) — chỉ để trên máy chủ. Cần thay
            key không gián đoạn: tạo key mới cùng quyền, triển khai, rồi thu hồi key cũ.
          </p>
          {revokedCount > 0 && (
            <label className="flex items-center gap-2 text-xs">
              <Switch checked={showRevoked} onCheckedChange={setShowRevoked} />
              Hiện {revokedCount} key đã thu hồi
            </label>
          )}
        </div>
      )}

      <KeyFormDialog
        apiKey={action?.kind === "edit" ? action.key : undefined}
        brands={brandList}
        isCurrent={targetIsCurrent}
        open={action?.kind === "edit"}
        onOpenChange={(o) => !o && setAction(null)}
      />

      <ConfirmDialog
        open={action?.kind === "rotate"}
        onOpenChange={(o) => !o && setAction(null)}
        title={`Xoay vòng "${target?.name ?? ""}"?`}
        tone={targetIsCurrent ? "primary" : "danger"}
        confirmLabel="Cấp key mới"
        description={
          targetIsCurrent
            ? "Đây là key app đang dùng. Key cũ ngừng hoạt động ngay — app sẽ tự chuyển sang key mới."
            : "Key cũ ngừng hoạt động ngay lập tức. Tên, quyền và thương hiệu được giữ nguyên. Cập nhật mọi dịch vụ đang dùng key này."
        }
        onConfirm={async () => {
          if (!target) return;
          const wasCurrent = targetIsCurrent;
          const res = await rotate.mutateAsync(target.id);
          if (wasCurrent) setApiKey(res.raw_key);
          setIssued({ key: res, appUpdated: wasCurrent });
        }}
      />

      <ConfirmDialog
        open={action?.kind === "revoke"}
        onOpenChange={(o) => !o && setAction(null)}
        title={`Thu hồi "${target?.name ?? ""}"?`}
        confirmLabel="Thu hồi vĩnh viễn"
        description={
          targetIsCurrent
            ? "Đây là key app đang dùng! Sau khi thu hồi, app không gọi được SocialAPI cho tới khi bạn nhập key khác trong Cài đặt. Không thể hoàn tác."
            : "Key ngừng hoạt động ngay, mọi request dùng nó trả về 401. Không thể hoàn tác."
        }
        onConfirm={async () => {
          if (!target) return;
          await revoke.mutateAsync(target.id);
          toast.success(`Đã thu hồi "${target.name}"`);
        }}
      />

      <SecretRevealDialog
        open={!!issued}
        onOpenChange={(o) => !o && setIssued(null)}
        title={issued?.key.name ?? "API key"}
        label="API key"
        secret={issued?.key.raw_key ?? ""}
      >
        {issued?.appUpdated && (
          <p className="rounded-lg bg-green-500/10 p-3 text-xs text-green-800 dark:text-green-300">
            App đã tự lưu key mới này, không cần nhập lại trong Cài đặt.
          </p>
        )}
      </SecretRevealDialog>
    </div>
  );
}

/**
 * SocialAPI endpoints for this screen (all but /keys/scopes need a full-access key):
 *   GET|POST /keys
 *   GET /keys/scopes
 *   PATCH|DELETE /keys/{id}
 *   POST /keys/{id}/rotate
 */
export function ApiKeysPage() {
  return (
    <RequireApiKey>
      <ApiKeysContent />
    </RequireApiKey>
  );
}

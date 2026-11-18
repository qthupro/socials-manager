import { Loader2, TriangleAlert } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import type { Brand } from "@/features/connections";
import { getErrorMessage } from "@/shared/api";
import { AppDialog, AppDialogClose } from "@/shared/components/app-dialog";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { cn } from "@/shared/lib/utils";

import { useCreateKey, useKeyScopes, useUpdateKey } from "../api/keys";
import type { ApiKeyItem, IssuedKey, KeyScope } from "../api/types";

/** Refused to brand-restricted keys even when held (they cover every brand). */
const ACCOUNT_WIDE_SCOPES = ["webhooks:manage", "analytics:read"];

function ModeChoice({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string; hint: string }[];
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-lg border p-3 text-left transition-colors hover:border-primary/50",
            value === o.value && "border-primary bg-primary/5 ring-1 ring-primary/30",
          )}
        >
          <p className="text-sm font-medium">{o.label}</p>
          <p className="text-xs text-muted-foreground">{o.hint}</p>
        </button>
      ))}
    </div>
  );
}

function ScopePicker({
  scopes,
  value,
  onChange,
}: {
  scopes: KeyScope[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const groups = new Map<string, KeyScope[]>();
  for (const s of scopes) groups.set(s.group, [...(groups.get(s.group) ?? []), s]);
  const selected = new Set(value);
  const toggle = (name: string, on: boolean) => {
    const next = new Set(selected);
    if (on) next.add(name);
    else next.delete(name);
    onChange([...next]);
  };

  return (
    <div className="max-h-72 space-y-3 overflow-y-auto rounded-lg border p-3">
      {[...groups].map(([group, items]) => (
        <div key={group} className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground uppercase">{group}</p>
          {items.map((s) => (
            <label key={s.name} className="flex items-start gap-2 text-sm">
              <Checkbox
                className="mt-0.5"
                checked={selected.has(s.name)}
                onCheckedChange={(v) => toggle(s.name, v === true)}
              />
              <span className="min-w-0">
                <code className="font-mono text-xs">{s.name}</code>
                <span className="block text-xs text-muted-foreground">{s.description}</span>
              </span>
            </label>
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Create a key (then show the raw key once) or edit one in place. PATCH replaces name,
 * scopes and brand_ids together — all three are always sent.
 */
export function KeyFormDialog({
  apiKey,
  brands,
  isCurrent,
  trigger,
  open: controlledOpen,
  onOpenChange,
  onIssued,
}: {
  apiKey?: ApiKeyItem;
  brands: Brand[];
  /** Editing the key this app is using. */
  isCurrent?: boolean;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onIssued?: (key: IssuedKey) => void;
}) {
  const scopes = useKeyScopes();
  const create = useCreateKey();
  const update = useUpdateKey();
  const [innerOpen, setInnerOpen] = useState(false);
  const open = controlledOpen ?? innerOpen;
  const [name, setName] = useState("");
  const [scopeMode, setScopeMode] = useState("full");
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [brandMode, setBrandMode] = useState("all");
  const [brandIds, setBrandIds] = useState<string[]>([]);
  const busy = create.isPending || update.isPending;

  const setOpen = (o: boolean) => {
    if (o) {
      setName(apiKey?.name ?? "");
      setSelectedScopes(apiKey?.scopes ?? []);
      setScopeMode(apiKey?.scopes?.length ? "scoped" : "full");
      setBrandIds(apiKey?.brand_ids ?? []);
      setBrandMode(apiKey?.brand_ids?.length ? "some" : "all");
    }
    setInnerOpen(o);
    onOpenChange?.(o);
  };

  const finalScopes = scopeMode === "scoped" ? selectedScopes : [];
  const finalBrands = brandMode === "some" ? brandIds : [];
  const restricted = finalScopes.length > 0 || finalBrands.length > 0;
  const lostAccountWide =
    finalBrands.length > 0 &&
    (finalScopes.length === 0 || finalScopes.some((s) => ACCOUNT_WIDE_SCOPES.includes(s)));
  const invalid =
    !name.trim() ||
    (scopeMode === "scoped" && selectedScopes.length === 0) ||
    (brandMode === "some" && brandIds.length === 0);

  const submit = async () => {
    const body = { name: name.trim(), scopes: finalScopes, brand_ids: finalBrands };
    try {
      if (apiKey) {
        await update.mutateAsync({ id: apiKey.id, body });
        toast.success("Đã lưu API key");
      } else {
        onIssued?.(await create.mutateAsync(body));
      }
      setOpen(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <AppDialog
      open={open}
      onOpenChange={setOpen}
      trigger={trigger}
      size="lg"
      title={apiKey ? "Sửa API key" : "Tạo API key"}
      description={
        apiKey
          ? "Đổi tên và giới hạn quyền. Giá trị key giữ nguyên, các dịch vụ đang dùng vẫn chạy."
          : "Mỗi dịch vụ một key, chỉ cấp quyền cần thiết — lộ key cũng không ảnh hưởng phần còn lại."
      }
      footerNote={restricted ? "Key bị giới hạn" : "Key toàn quyền"}
      footer={
        <>
          <AppDialogClose asChild>
            <Button variant="outline" size="sm">
              Huỷ
            </Button>
          </AppDialogClose>
          <Button size="sm" disabled={invalid || busy} onClick={submit}>
            {busy && <Loader2 className="animate-spin" />} {apiKey ? "Lưu" : "Tạo key"}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid gap-1.5">
          <Label htmlFor="key-name">Tên</Label>
          <Input
            id="key-name"
            placeholder="vd. Server production, Bot trả lời bình luận"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="grid gap-2">
          <Label>Quyền (scopes)</Label>
          <ModeChoice
            value={scopeMode}
            onChange={setScopeMode}
            options={[
              { value: "full", label: "Toàn quyền", hint: "Mọi thao tác, kể cả quản lý API key." },
              { value: "scoped", label: "Giới hạn", hint: "Chỉ các thao tác được chọn bên dưới." },
            ]}
          />
          {scopeMode === "scoped" &&
            (scopes.isLoading ? (
              <Skeleton className="h-48 rounded-lg" />
            ) : (
              <ScopePicker
                scopes={scopes.data ?? []}
                value={selectedScopes}
                onChange={setSelectedScopes}
              />
            ))}
        </div>

        <div className="grid gap-2">
          <Label>Thương hiệu</Label>
          <ModeChoice
            value={brandMode}
            onChange={setBrandMode}
            options={[
              { value: "all", label: "Mọi thương hiệu", hint: "Thấy mọi tài khoản, bài, hội thoại." },
              { value: "some", label: "Chỉ một số", hint: "Như thể chỉ có các thương hiệu đã chọn." },
            ]}
          />
          {brandMode === "some" && (
            <div className="max-h-48 space-y-1.5 overflow-y-auto rounded-lg border p-3">
              {brands.length === 0 ? (
                <p className="text-xs text-muted-foreground">Chưa có thương hiệu nào.</p>
              ) : (
                brands.map((b) => (
                  <label key={b.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={brandIds.includes(b.id)}
                      onCheckedChange={(v) =>
                        setBrandIds((ids) =>
                          v === true ? [...ids, b.id] : ids.filter((x) => x !== b.id),
                        )
                      }
                    />
                    {b.name}
                    <span className="text-xs text-muted-foreground">
                      · {b.accounts_count} tài khoản
                    </span>
                  </label>
                ))
              )}
            </div>
          )}
        </div>

        {(lostAccountWide || restricted) && (
          <div className="space-y-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200">
            {restricted && (
              <p className="flex gap-1.5">
                <TriangleAlert className="size-3.5 shrink-0" />
                Key giới hạn không tạo / sửa / xoay vòng / thu hồi được API key (kể cả chính nó).
              </p>
            )}
            {lostAccountWide && (
              <p className="flex gap-1.5">
                <TriangleAlert className="size-3.5 shrink-0" />
                Key giới hạn theo thương hiệu luôn bị từ chối Webhooks và Nhật ký sự kiện / xuất báo
                cáo (webhooks:manage, analytics:read), vì chúng áp dụng cho cả tài khoản.
              </p>
            )}
            {isCurrent && restricted && (
              <p className="flex gap-1.5 font-medium">
                <TriangleAlert className="size-3.5 shrink-0" />
                Đây là key app đang dùng — giới hạn nó sẽ khoá các màn hình cần quyền đã bỏ.
              </p>
            )}
          </div>
        )}
      </div>
    </AppDialog>
  );
}

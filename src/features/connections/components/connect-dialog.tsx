import { ArrowLeft, CircleCheck, ExternalLink, Info, Loader2 } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";

import { getErrorMessage, useMe } from "@/shared/api";
import { AppDialog, AppDialogClose } from "@/shared/components/app-dialog";
import { CopyButton } from "@/shared/components/copy-button";
import { PlatformIcon } from "@/shared/components/platform-icon";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Textarea } from "@/shared/components/ui/textarea";
import { facebookPageCapLabel } from "@/shared/config/plans";
import {
  getPlatform,
  PLATFORMS,
  type PlatformConfig,
  type PlatformSlug,
} from "@/shared/config/platforms";
import { cn } from "@/shared/lib/utils";
import { openExternal } from "@/shared/platform/opener";

import { useAccounts, useConnectAccount } from "../api/accounts";
import { useBrands } from "../api/brands";
import { isOAuthResponse, type SocialAccount } from "../api/types";

type Phase = "pick" | "form" | "waiting" | "done";

/** Accounts we saw before opening the consent screen, to spot the new one while polling. */
interface Snapshot {
  ids: Set<string>;
  authUrl: string;
}

interface ConnectDialogProps {
  trigger: ReactNode;
  /** Preset brand; otherwise the user picks one. */
  brandId?: string;
  /** Preset platform; otherwise the user picks one. */
  platform?: PlatformSlug;
  /** Reconnect this account (same platform + its brand). */
  reconnect?: SocialAccount;
}

const POLL_MS = 3000;

export function ConnectDialog({
  trigger,
  brandId: presetBrand,
  platform: presetPlatform,
  reconnect,
}: ConnectDialogProps) {
  const reconnectPlatform = reconnect ? getPlatform(reconnect.platform)?.slug : undefined;
  const fixedBrand = reconnect?.brand_id ?? presetBrand;
  const fixedPlatform = reconnectPlatform ?? presetPlatform;

  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("pick");
  const [brandId, setBrandId] = useState<string | undefined>(fixedBrand);
  const [platform, setPlatform] = useState<PlatformSlug | undefined>(fixedPlatform);
  const [connectionType, setConnectionType] = useState("");
  const [creds, setCreds] = useState<Record<string, string>>({});
  const [snapshot, setSnapshot] = useState<Snapshot>();
  const [connectedName, setConnectedName] = useState("");

  const brands = useBrands();
  const me = useMe();
  const connect = useConnectAccount();
  const accounts = useAccounts(brandId, {
    enabled: open && !!brandId,
    refetchInterval: phase === "waiting" ? POLL_MS : false,
  });

  const config = platform ? getPlatform(platform) : undefined;

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setBrandId(fixedBrand);
      setPlatform(fixedPlatform);
      setPhase(fixedPlatform ? "form" : "pick");
      const types = fixedPlatform ? getPlatform(fixedPlatform)?.connectionTypes : undefined;
      // Reconnecting a LinkedIn account keeps its connection type.
      setConnectionType(reconnect?.connection_type ?? types?.[0]?.value ?? "");
      setCreds({});
      setSnapshot(undefined);
      setConnectedName("");
    }
    setOpen(next);
  };

  const choosePlatform = (p: PlatformConfig) => {
    setPlatform(p.slug);
    setConnectionType(p.connectionTypes?.[0]?.value ?? "");
    setCreds({});
    setPhase("form");
  };

  // While waiting on the browser, the new (or reconnected) account shows up in the polled list.
  const detected =
    phase === "waiting" && snapshot
      ? accounts.data?.find((a) =>
          reconnect
            ? a.id === reconnect.id && a.status === "active" && reconnect.status !== "active"
            : !snapshot.ids.has(a.id) && getPlatform(a.platform)?.slug === platform,
        )
      : undefined;
  const isDone = phase === "done" || !!detected;
  const doneName = detected?.name ?? connectedName;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!platform || !brandId || !config) return;

    const metadata: Record<string, string> = {};
    if (connectionType) metadata.connection_type = connectionType;
    for (const f of config.credentialFields ?? []) {
      const v = creds[f.key]?.trim();
      if (v) metadata[f.key] = v;
    }

    try {
      const res = await connect.mutateAsync({
        platform,
        brand_id: brandId,
        ...(Object.keys(metadata).length > 0 && { metadata }),
      });

      if (isOAuthResponse(res)) {
        setSnapshot({
          ids: new Set((accounts.data ?? []).map((a) => a.id)),
          authUrl: res.auth_url,
        });
        // Don't auto-open: the user may want the link in the browser profile that's
        // logged into the social account. They copy it or open it from the dialog.
        setPhase("waiting");
      } else {
        setConnectedName(res.display_name || res.username);
        setPhase("done");
        toast.success(`Đã kết nối ${res.display_name || res.username}`);
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  // Platforms that can't be added to this brand (one per platform, except LinkedIn).
  // Plan restrictions are left to SocialAPI, which returns a clear error on connect.
  const blockedReason = (p: PlatformConfig): string | undefined => {
    const taken = accounts.data?.some((a) => getPlatform(a.platform)?.slug === p.slug);
    if (taken && !p.multiplePerBrand) return "Đã kết nối";
    return undefined;
  };

  const title = reconnect ? `Kết nối lại ${config?.label ?? ""}` : "Kết nối tài khoản";

  return (
    <AppDialog
      open={open}
      onOpenChange={handleOpenChange}
      trigger={trigger}
      title={title}
      description={
        reconnect ? reconnect.name : "Mỗi thương hiệu được 1 tài khoản cho mỗi nền tảng."
      }
      size="lg"
      footer={
        isDone ? (
          <AppDialogClose asChild>
            <Button size="sm">Xong</Button>
          </AppDialogClose>
        ) : phase === "waiting" ? (
          <AppDialogClose asChild>
            <Button variant="outline" size="sm">
              Đóng
            </Button>
          </AppDialogClose>
        ) : phase === "form" ? (
          <>
            {!fixedPlatform && (
              <Button variant="ghost" size="sm" onClick={() => setPhase("pick")}>
                <ArrowLeft /> Chọn nền tảng khác
              </Button>
            )}
            <Button
              size="sm"
              type="submit"
              form="connect-form"
              disabled={!brandId || connect.isPending}
            >
              {connect.isPending
                ? "Đang xử lý…"
                : config?.connect === "oauth"
                  ? "Tạo link kết nối"
                  : "Kết nối"}
            </Button>
          </>
        ) : undefined
      }
    >
      {isDone ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <CircleCheck className="size-12 text-green-600" />
          <p className="font-medium">Đã kết nối {doneName}</p>
          <p className="text-sm text-muted-foreground">Tài khoản đã sẵn sàng trong thương hiệu.</p>
        </div>
      ) : phase === "waiting" && snapshot ? (
        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="auth-url">Link kết nối {config?.label}</Label>
            <div className="flex gap-2">
              <Input
                id="auth-url"
                readOnly
                value={snapshot.authUrl}
                onFocus={(e) => e.currentTarget.select()}
                className="font-mono text-xs"
              />
              <CopyButton value={snapshot.authUrl} label="Sao chép" />
            </div>
            <p className="text-xs text-muted-foreground">
              Dán link vào trình duyệt đang đăng nhập tài khoản {config?.label} cần kết nối, hoặc mở
              bằng trình duyệt mặc định. Link dùng được 1 lần, hiệu lực 1 giờ.
            </p>
            <Button variant="outline" size="sm" onClick={() => openExternal(snapshot.authUrl)}>
              <ExternalLink /> Mở trong trình duyệt mặc định
            </Button>
          </div>

          <div className="flex items-center gap-3 rounded-lg bg-muted/60 p-3 text-sm">
            <Loader2 className="size-4 shrink-0 animate-spin text-primary" />
            <span className="text-muted-foreground">
              Đang chờ bạn đăng nhập và cấp quyền… App sẽ tự nhận khi kết nối xong.
            </span>
          </div>

          {config?.mayNeedSelection && (
            <p className="text-xs text-muted-foreground">
              Nếu cần chọn Page / địa điểm / số điện thoại, SocialAPI sẽ đưa bạn tới dashboard để
              chọn.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {!fixedBrand && (
            <div className="grid gap-2">
              <Label>Thương hiệu</Label>
              <Select value={brandId} onValueChange={setBrandId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={brands.isLoading ? "Đang tải…" : "Chọn thương hiệu"} />
                </SelectTrigger>
                <SelectContent>
                  {brands.data?.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {brands.data?.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Chưa có thương hiệu nào, hãy tạo trước.
                </p>
              )}
            </div>
          )}

          {phase === "pick" ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {PLATFORMS.map((p) => {
                const blocked = brandId ? blockedReason(p) : undefined;
                return (
                  <button
                    key={p.slug}
                    type="button"
                    disabled={!brandId || !!blocked}
                    onClick={() => choosePlatform(p)}
                    className="flex items-center gap-3 rounded-xl border p-3 text-left transition-colors hover:border-primary hover:bg-primary/5 disabled:opacity-50 disabled:hover:border-border disabled:hover:bg-transparent"
                  >
                    <PlatformIcon platform={p.slug} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{p.label}</span>
                      <span className="block text-xs text-muted-foreground">
                        {blocked ?? (p.connect === "oauth" ? "Đăng nhập" : "Nhập token")}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            config && (
              <form id="connect-form" onSubmit={submit} className="space-y-4">
                <div className="flex items-center gap-3">
                  <PlatformIcon platform={config.slug} />
                  <span className="font-medium">{config.label}</span>
                </div>

                <div className="flex gap-2 rounded-lg bg-muted/60 p-3 text-sm text-muted-foreground">
                  <Info className="mt-0.5 size-4 shrink-0" />
                  <span>
                    {config.note}
                    {config.slug === "facebook" && me.data && (
                      <> Gói của bạn: {facebookPageCapLabel(me.data.plan)?.toLowerCase()}.</>
                    )}
                  </span>
                </div>

                {config.connectionTypes && (
                  <div className="grid gap-2">
                    <Label>Loại tài khoản</Label>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {config.connectionTypes.map((t) => (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => setConnectionType(t.value)}
                          className={cn(
                            "rounded-lg border p-3 text-left transition-colors hover:bg-muted/50",
                            connectionType === t.value &&
                              "border-primary bg-primary/5 ring-1 ring-primary",
                          )}
                        >
                          <span className="block text-sm font-medium">{t.label}</span>
                          <span className="block text-xs text-muted-foreground">
                            {t.description}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {config.credentialFields?.map((f) => (
                  <div key={f.key} className="grid gap-2">
                    <Label htmlFor={`cred-${f.key}`}>
                      {f.label}
                      {f.required && <span className="text-destructive">*</span>}
                    </Label>
                    {f.type === "textarea" ? (
                      <Textarea
                        id={`cred-${f.key}`}
                        required={f.required}
                        rows={5}
                        placeholder={f.placeholder}
                        className="font-mono text-xs"
                        value={creds[f.key] ?? ""}
                        onChange={(e) => setCreds((c) => ({ ...c, [f.key]: e.target.value }))}
                      />
                    ) : (
                      <Input
                        id={`cred-${f.key}`}
                        type={f.type}
                        required={f.required}
                        autoComplete="off"
                        placeholder={f.placeholder}
                        value={creds[f.key] ?? ""}
                        onChange={(e) => setCreds((c) => ({ ...c, [f.key]: e.target.value }))}
                      />
                    )}
                    {f.help && <p className="text-xs text-muted-foreground">{f.help}</p>}
                  </div>
                ))}

                {config.connect === "oauth" && (
                  <p className="text-xs text-muted-foreground">
                    Trang đăng nhập của {config.label} sẽ mở trong trình duyệt mặc định.
                  </p>
                )}
              </form>
            )
          )}
        </div>
      )}
    </AppDialog>
  );
}

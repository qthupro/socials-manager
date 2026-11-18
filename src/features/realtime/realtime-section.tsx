import { ExternalLink, Loader2, Rocket, Send, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { getErrorMessage, useApiKey } from "@/shared/api";
import { AppDialog, AppDialogClose } from "@/shared/components/app-dialog";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { SettingsRow, SettingsSection } from "@/shared/components/settings-list";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";
import { cn } from "@/shared/lib/utils";
import { openExternal } from "@/shared/platform/opener";
import { useRealtimeStatus, type RealtimeState } from "@/shared/realtime";

import { webhooksApi } from "./api";
import { deployBackend, deploymentNameFromKey, isProdKey } from "./backend/deploy";
import { deleteWebhook } from "./lifecycle";
import { useRealtimeConfig } from "./store";

const STATUS: Record<RealtimeState, { label: string; dot: string }> = {
  off: { label: "Tắt", dot: "bg-muted-foreground/50" },
  starting: { label: "Đang kết nối", dot: "bg-amber-500 animate-pulse" },
  online: { label: "Đang chạy", dot: "bg-green-500" },
  error: { label: "Lỗi", dot: "bg-destructive" },
};

function ExternalLinkButton({ href, children }: { href: string; children: string }) {
  return (
    <button
      type="button"
      onClick={() => openExternal(href)}
      className="inline-flex items-center gap-1 text-primary underline-offset-2 hover:underline"
    >
      {children} <ExternalLink className="size-3" />
    </button>
  );
}

/**
 * The user's own Convex prod deploy key + a Deploy button that pushes the webhook
 * receiver to THEIR deployment (each user has a separate one, nothing is shared).
 */
function SetupDialog() {
  const config = useRealtimeConfig();
  const [open, setOpen] = useState(false);
  const [deployKey, setDeployKey] = useState("");
  const [step, setStep] = useState<string | null>(null);

  const key = deployKey.trim();
  const name = deploymentNameFromKey(key);
  const deploying = step !== null;

  const handleOpenChange = (next: boolean) => {
    if (deploying) return;
    if (next) setDeployKey(config.deployKey);
    setOpen(next);
  };

  const deploy = async (e: FormEvent) => {
    e.preventDefault();
    if (!name) return;
    const sameDeployment = config.backend?.name === name;
    setStep("Đang chuẩn bị…");
    try {
      const result = await deployBackend(key, {
        // Same deployment: keep the token so a running connection stays valid.
        readToken: sameDeployment ? config.backend?.readToken : undefined,
        onStep: setStep,
      });
      config.set({
        deployKey: key,
        backend: {
          ...result.deployment,
          readToken: result.readToken,
          version: result.version,
          // Same deployment keeps its WEBHOOK_SECRET; a new one needs it set again.
          secretHookId: sameDeployment ? (config.backend?.secretHookId ?? null) : null,
        },
        enabled: true,
      });
      setOpen(false);
      toast.success(`Đã deploy lên Convex (${result.deployment.name})`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setStep(null);
    }
  };

  return (
    <AppDialog
      open={open}
      onOpenChange={handleOpenChange}
      trigger={
        <Button variant="ghost" size="sm" className="h-7 text-xs">
          Thiết lập
        </Button>
      }
      title="Realtime qua Convex"
      description="Webhook được gửi tới Convex của riêng bạn rồi đẩy về app ngay lập tức — không cần mở cổng hay ngrok."
      footer={
        <>
          <AppDialogClose asChild>
            <Button variant="outline" size="sm" disabled={deploying}>
              Huỷ
            </Button>
          </AppDialogClose>
          <Button size="sm" type="submit" form="convex-form" disabled={!name || deploying}>
            {deploying ? <Loader2 className="animate-spin" /> : <Rocket />}
            {config.backend ? "Deploy lại" : "Deploy lên Convex"}
          </Button>
        </>
      }
    >
      <form id="convex-form" onSubmit={deploy} className="space-y-4">
        <ol className="list-decimal space-y-1 pl-4 text-xs text-muted-foreground">
          <li>
            Tạo project miễn phí trên{" "}
            <ExternalLinkButton href="https://dashboard.convex.dev">Convex</ExternalLinkButton>.
          </li>
          <li>
            Mở deployment <b>Production</b> → Settings → Deploy keys → Generate.
          </li>
          <li>Dán key vào đây và bấm Deploy.</li>
        </ol>
        <div className="grid gap-1.5">
          <Label htmlFor="convex-key">Production deploy key</Label>
          <Input
            id="convex-key"
            type="password"
            autoComplete="off"
            placeholder="prod:ten-deployment|…"
            value={deployKey}
            disabled={deploying}
            onChange={(e) => setDeployKey(e.target.value)}
            className="font-mono"
          />
          <p className="text-xs text-muted-foreground">
            {key && !name ? (
              <span className="text-destructive">
                Key không đúng dạng prod:&lt;tên&gt;|&lt;token&gt;
              </span>
            ) : key && !isProdKey(key) ? (
              "Nên dùng key của deployment Production (dev deployment có thể bị tạm dừng)."
            ) : (
              "Key chỉ lưu trên máy này và chỉ có quyền với deployment của bạn."
            )}
          </p>
        </div>
        {config.backend && (
          <p className="text-xs text-muted-foreground">
            Đang dùng: <span className="font-mono">{config.backend.name}</span>
          </p>
        )}
        {step && (
          <p className="flex items-center gap-2 text-xs">
            <Loader2 className="size-3 animate-spin" /> {step}
          </p>
        )}
      </form>
    </AppDialog>
  );
}

export function RealtimeSection() {
  const config = useRealtimeConfig();
  const status = useRealtimeStatus();
  const hasApiKey = useApiKey((s) => !!s.apiKey);
  const [testing, setTesting] = useState(false);
  const s = STATUS[status.state];
  const ready = !!config.backend && !!config.deployKey;

  const hint =
    status.state === "error" ? (
      <span className="text-destructive" title={status.error}>
        {status.error}
      </span>
    ) : status.state === "online" ? (
      <span className="font-mono" title={status.url}>
        {status.url}
      </span>
    ) : !ready ? (
      "Tuỳ chọn · cần deploy lên Convex của bạn"
    ) : (
      "Tắt thì app tự kiểm tra định kỳ (polling)"
    );

  const sendTest = async () => {
    if (!config.webhook) return;
    setTesting(true);
    try {
      const r = await webhooksApi.test(config.webhook.id);
      if (r.status === "delivered")
        toast.success(`Webhook hoạt động (${r.response_duration_ms} ms)`);
      else toast.error(`Webhook không tới được Convex (HTTP ${r.response_status_code || "—"})`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setTesting(false);
    }
  };

  return (
    <SettingsSection
      title="Realtime"
      action={
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className={cn("size-1.5 rounded-full", s.dot)} />
          {s.label}
        </span>
      }
    >
      <SettingsRow label="Webhook qua Convex" hint={hint}>
        {config.webhook && (
          <>
            <Button
              variant="ghost"
              size="icon-sm"
              title="Gửi webhook thử"
              disabled={testing || status.state !== "online"}
              onClick={sendTest}
            >
              <Send />
            </Button>
            <ConfirmDialog
              trigger={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  title="Xoá webhook"
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 />
                </Button>
              }
              title="Xoá webhook trên SocialAPI?"
              description="Realtime sẽ tắt và app quay về polling."
              confirmLabel="Xoá"
              onConfirm={async () => {
                config.set({ enabled: false });
                await deleteWebhook();
                toast.success("Đã xoá webhook");
              }}
            />
          </>
        )}
        <SetupDialog />
        <Switch
          size="sm"
          checked={config.enabled}
          disabled={!hasApiKey || !ready}
          onCheckedChange={(v) => config.set({ enabled: v })}
        />
      </SettingsRow>
    </SettingsSection>
  );
}

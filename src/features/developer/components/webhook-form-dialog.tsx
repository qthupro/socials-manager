import { Loader2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import { getErrorMessage } from "@/shared/api";
import { AppDialog, AppDialogClose } from "@/shared/components/app-dialog";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";

import type { CreatedWebhook, WebhookEndpoint } from "../api/types";
import { useCreateWebhook, useUpdateWebhook, useWebhookEventCatalog } from "../api/webhooks";
import { EventPicker } from "./event-picker";
import { SecretRevealDialog } from "./secret-reveal-dialog";

const isHttpsUrl = (s: string) => {
  try {
    return new URL(s).protocol === "https:";
  } catch {
    return false;
  }
};

/** Create (shows the signing secret once afterwards) or edit an endpoint's URL / events. */
export function WebhookFormDialog({
  webhook,
  trigger,
  onCreated,
}: {
  webhook?: WebhookEndpoint;
  trigger: ReactNode;
  onCreated?: (id: string) => void;
}) {
  const catalog = useWebhookEventCatalog();
  const create = useCreateWebhook();
  const update = useUpdateWebhook();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>([]);
  const [created, setCreated] = useState<CreatedWebhook | null>(null);
  const busy = create.isPending || update.isPending;
  const urlValid = isHttpsUrl(url.trim());

  const submit = async () => {
    try {
      if (webhook) {
        await update.mutateAsync({ id: webhook.id, patch: { url: url.trim(), events } });
        toast.success("Đã lưu endpoint");
      } else {
        const res = await create.mutateAsync({ url: url.trim(), events });
        setCreated(res);
        onCreated?.(res.id);
      }
      setOpen(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <>
      <AppDialog
        open={open}
        onOpenChange={(o) => {
          if (o) {
            setUrl(webhook?.url ?? "");
            setEvents(webhook?.events ?? []);
          }
          setOpen(o);
        }}
        trigger={trigger}
        size="lg"
        title={webhook ? "Sửa webhook endpoint" : "Thêm webhook endpoint"}
        description="SocialAPI gửi POST JSON có chữ ký tới URL này mỗi khi sự kiện bạn chọn xảy ra, cho mọi tài khoản và thương hiệu."
        footerNote={`Đã chọn ${events.length} sự kiện`}
        footer={
          <>
            <AppDialogClose asChild>
              <Button variant="outline" size="sm">
                Huỷ
              </Button>
            </AppDialogClose>
            <Button size="sm" disabled={!urlValid || events.length === 0 || busy} onClick={submit}>
              {busy && <Loader2 className="animate-spin" />} {webhook ? "Lưu" : "Tạo endpoint"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-1.5">
            <Label htmlFor="wh-url">URL nhận sự kiện</Label>
            <Input
              id="wh-url"
              placeholder="https://example.com/webhooks/socialapi"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              aria-invalid={url.trim() !== "" && !urlValid}
            />
            <p className="text-xs text-muted-foreground">
              {url.trim() !== "" && !urlValid
                ? "URL phải bắt đầu bằng https://"
                : "Chỉ nhận HTTPS. Endpoint phải trả 2xx trong 10 giây."}
            </p>
          </div>
          <div className="grid gap-1.5">
            <div className="flex items-center justify-between">
              <Label>Sự kiện đăng ký</Label>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7"
                  onClick={() => setEvents((catalog.data ?? []).map((e) => e.event))}
                >
                  Chọn tất cả
                </Button>
                <Button variant="ghost" size="sm" className="h-7" onClick={() => setEvents([])}>
                  Bỏ chọn
                </Button>
              </div>
            </div>
            <EventPicker
              catalog={catalog.data ?? []}
              loading={catalog.isLoading}
              value={events}
              onChange={setEvents}
            />
          </div>
        </div>
      </AppDialog>

      <SecretRevealDialog
        open={!!created}
        onOpenChange={(o) => !o && setCreated(null)}
        title="Đã tạo webhook endpoint"
        label="Signing secret"
        secret={created?.secret ?? ""}
      >
        <p className="text-xs text-muted-foreground">
          Dùng secret này làm khoá HMAC-SHA256 để kiểm tra header{" "}
          <code className="font-mono">X-SocialAPI-Signature-V2</code> ={" "}
          <code className="font-mono">sha256=hex(HMAC(secret, "&lt;timestamp&gt;.&lt;raw body&gt;"))</code>
          . Mất secret thì phải tạo endpoint mới và xoá endpoint cũ.
        </p>
      </SecretRevealDialog>
    </>
  );
}

import { Loader2, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { getErrorMessage } from "@/shared/api";
import { AppDialog, AppDialogClose } from "@/shared/components/app-dialog";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Textarea } from "@/shared/components/ui/textarea";

import type { TestDeliveryResult } from "../api/types";
import { useTestWebhook, useWebhookEventCatalog } from "../api/webhooks";
import { formatMs } from "../lib/format";
import { httpTone } from "../lib/status";
import { StatusPill } from "./status-pill";

const PING = "test.ping";

const template = (event: string) =>
  JSON.stringify({ event, data: { test: true, sent_by: "social-manager" } }, null, 2);

/** POST /webhooks/{id}/test — one signed request, body sent exactly as typed, not retried. */
export function WebhookTestDialog({ webhookId }: { webhookId: string }) {
  const catalog = useWebhookEventCatalog();
  const test = useTestWebhook();
  const [open, setOpen] = useState(false);
  const [event, setEvent] = useState(PING);
  const [body, setBody] = useState(template(PING));
  const [result, setResult] = useState<TestDeliveryResult | null>(null);

  let payload: Record<string, unknown> | null = null;
  try {
    const parsed: unknown = JSON.parse(body);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      payload = parsed as Record<string, unknown>;
    }
  } catch {
    // Invalid JSON — the send button stays disabled.
  }

  const send = async () => {
    if (!payload) return;
    setResult(null);
    try {
      setResult(await test.mutateAsync({ id: webhookId, eventType: event, payload }));
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <AppDialog
      open={open}
      onOpenChange={(o) => {
        if (o) {
          setEvent(PING);
          setBody(template(PING));
          setResult(null);
        }
        setOpen(o);
      }}
      trigger={
        <Button variant="outline" size="sm">
          <Send /> Gửi thử
        </Button>
      }
      size="lg"
      title="Gửi sự kiện thử"
      description="Gửi một request có chữ ký tới endpoint để kiểm tra kết nối và cách xử lý. Lượt thử không được gửi lại khi lỗi."
      footer={
        <>
          <AppDialogClose asChild>
            <Button variant="outline" size="sm">
              Đóng
            </Button>
          </AppDialogClose>
          <Button size="sm" disabled={!payload || test.isPending} onClick={send}>
            {test.isPending ? <Loader2 className="animate-spin" /> : <Send />} Gửi
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-1.5">
          <Label>Loại sự kiện (header X-SocialAPI-Event)</Label>
          <Select
            value={event}
            onValueChange={(v) => {
              setEvent(v);
              setBody(template(v));
            }}
          >
            <SelectTrigger className="w-full font-mono text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={PING} className="font-mono text-xs">
                {PING}
              </SelectItem>
              {(catalog.data ?? []).map((e) => (
                <SelectItem key={e.event} value={e.event} className="font-mono text-xs">
                  {e.event}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="wh-test-body">Payload (gửi nguyên văn làm body)</Label>
          <Textarea
            id="wh-test-body"
            className="min-h-40 font-mono text-xs"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            aria-invalid={!payload}
          />
          {!payload && <p className="text-xs text-destructive">Payload phải là một object JSON.</p>}
        </div>

        {result && (
          <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <StatusPill tone={result.status === "delivered" ? "ok" : "fail"}>
                {result.status === "delivered" ? "Thành công" : "Thất bại"}
              </StatusPill>
              <StatusPill tone={httpTone(result.response_status_code)}>
                HTTP {result.response_status_code || "— (không kết nối được)"}
              </StatusPill>
              <span className="text-xs text-muted-foreground">
                {formatMs(result.response_duration_ms)}
              </span>
            </div>
            {result.response_body && (
              <pre className="max-h-40 overflow-auto rounded-md bg-background p-2 font-mono text-xs whitespace-pre-wrap">
                {result.response_body}
              </pre>
            )}
          </div>
        )}
      </div>
    </AppDialog>
  );
}

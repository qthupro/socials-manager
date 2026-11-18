import { Download, ExternalLink, FileDown, FileSpreadsheet, Loader2, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useAccounts, type SocialAccount } from "@/features/connections";
import { getErrorMessage } from "@/shared/api";
import { AccountAvatar } from "@/shared/components/account-avatar";
import { AppDialog, AppDialogClose } from "@/shared/components/app-dialog";
import { PageHeader } from "@/shared/components/page-header";
import { EmptyState, ErrorState, RequireApiKey } from "@/shared/components/state-views";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { getPlatform } from "@/shared/config/platforms";
import { cn } from "@/shared/lib/utils";
import { openExternal } from "@/shared/platform/opener";

import { useCreateExport, useExport, useExports } from "../api/analytics";
import type { ExportItem } from "../api/types";
import { isPast } from "../lib/format";

const ALL = "all";

const STATUS: Record<string, { label: string; className: string }> = {
  pending: { label: "Đang chờ", className: "bg-muted text-muted-foreground" },
  processing: {
    label: "Đang xử lý",
    className: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  },
  completed: { label: "Hoàn tất", className: "bg-green-500/15 text-green-700 dark:text-green-300" },
  failed: { label: "Thất bại", className: "bg-destructive/15 text-destructive" },
};

const dateTime = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const isRunning = (e: ExportItem) => e.status === "pending" || e.status === "processing";
const slugOf = (platform: string) => getPlatform(platform)?.slug;

/** Pinterest can't export (account.exports_not_supported); messaging channels have no posts. */
const notExportable = (a: SocialAccount) =>
  ["pinterest", "whatsapp", "telegram", "app_store_connect"].includes(slugOf(a.platform) ?? "");

function CreateExportDialog({
  accounts,
  disabled,
}: {
  accounts: SocialAccount[];
  disabled: boolean;
}) {
  const create = useCreateExport();
  const [open, setOpen] = useState(false);
  const [accountId, setAccountId] = useState("");
  const [transcript, setTranscript] = useState(false);
  const [vision, setVision] = useState(false);
  const usable = accounts.filter((a) => !notExportable(a));
  const account = usable.find((a) => a.id === accountId);

  const submit = async () => {
    try {
      await create.mutateAsync({
        accountId,
        body: {
          ...(transcript && { include_transcript: true }),
          ...(vision && { include_vision: true }),
        },
      });
      toast.success("Đã bắt đầu xuất báo cáo — có thể mất vài phút");
      setOpen(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <AppDialog
      open={open}
      onOpenChange={(o) => {
        if (o) {
          setAccountId(usable[0]?.id ?? "");
          setTranscript(false);
          setVision(false);
        }
        setOpen(o);
      }}
      trigger={
        <Button
          size="sm"
          disabled={disabled}
          title={disabled ? "Đang có báo cáo chạy — mỗi lúc chỉ chạy 1" : undefined}
        >
          <Plus /> Tạo báo cáo
        </Button>
      }
      title="Xuất báo cáo tài khoản"
      description="SocialAPI tổng hợp video / bài và chỉ số của tài khoản thành file Excel và trang báo cáo."
      footer={
        <>
          <AppDialogClose asChild>
            <Button variant="outline" size="sm">
              Huỷ
            </Button>
          </AppDialogClose>
          <Button size="sm" disabled={!accountId || create.isPending} onClick={submit}>
            {create.isPending && <Loader2 className="animate-spin" />} Xuất báo cáo
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-1.5">
          <Label>Tài khoản</Label>
          <Select value={accountId} onValueChange={setAccountId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Chọn tài khoản" />
            </SelectTrigger>
            <SelectContent>
              {usable.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  <AccountAvatar picture={a.profile_picture_url} platform={a.platform} />
                  {a.page_name ?? a.name}
                  <span className="text-muted-foreground">· {getPlatform(a.platform)?.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {accounts.some((a) => slugOf(a.platform) === "pinterest") && (
            <p className="text-xs text-muted-foreground">Pinterest không hỗ trợ xuất báo cáo.</p>
          )}
        </div>
        <div className="space-y-2">
          <label className="flex items-start gap-2 text-sm">
            <Checkbox
              className="mt-0.5"
              checked={transcript}
              onCheckedChange={(v) => setTranscript(!!v)}
            />
            <span>
              Kèm lời thoại video (transcript)
              {account && slugOf(account.platform) === "tiktok" && (
                <span className="block text-xs text-muted-foreground">
                  TikTok kết nối dạng doanh nghiệp (mặc định) không hỗ trợ — cần kết nối dạng
                  creator.
                </span>
              )}
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm">
            <Checkbox className="mt-0.5" checked={vision} onCheckedChange={(v) => setVision(!!v)} />
            <span>
              Kèm phân tích hình ảnh (vision)
              <span className="block text-xs text-muted-foreground">
                Chỉ gói trả phí — gói Free sẽ bỏ qua.
              </span>
            </span>
          </label>
        </div>
        <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
          Hạn mức theo gói: Free 2 lần/kỳ (30 video, cách nhau 7 ngày, link 7 ngày) · Starter 10 lần
          (200 video, 24h) · Pro 20 lần (500 video, 1h) · Business / Enterprise không giới hạn. Mỗi
          lúc chỉ chạy 1 báo cáo.
        </div>
      </div>
    </AppDialog>
  );
}

/** Download / report links — fetched from GET /exports/{id} (the list has no result). */
function ExportLinks({ id }: { id: string }) {
  const detail = useExport(id);
  if (detail.isLoading) return <Loader2 className="size-4 animate-spin text-muted-foreground" />;
  const result = detail.data?.result;
  if (!result) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <div className="flex justify-end gap-1">
      <Button
        variant="outline"
        size="sm"
        className="h-7"
        onClick={() => openExternal(result.excel_url)}
      >
        <Download /> Excel
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-7"
        onClick={() => openExternal(result.report_url)}
      >
        <ExternalLink /> Báo cáo
      </Button>
    </div>
  );
}

function ExportsContent() {
  const accounts = useAccounts();
  const [status, setStatus] = useState(ALL);
  const exports = useExports(status === ALL ? undefined : status);
  const list = exports.data ?? [];
  const byId = new Map((accounts.data ?? []).map((a) => [a.id, a]));
  const running = list.some(isRunning);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Xuất báo cáo"
        description="Báo cáo theo từng tài khoản: file Excel và trang báo cáo do SocialAPI tạo."
        actions={<CreateExportDialog accounts={accounts.data ?? []} disabled={running} />}
      />

      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Mọi trạng thái</SelectItem>
          {Object.entries(STATUS).map(([k, s]) => (
            <SelectItem key={k} value={k}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {exports.error ? (
        <ErrorState error={exports.error} onRetry={() => exports.refetch()} />
      ) : exports.isLoading ? (
        <Skeleton className="h-48 rounded-xl" />
      ) : list.length === 0 ? (
        <EmptyState
          icon={FileDown}
          title={status === ALL ? "Chưa có báo cáo nào" : "Không có báo cáo ở trạng thái này"}
          description="Chọn “Tạo báo cáo” để xuất video / bài và chỉ số của một tài khoản ra Excel."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">Tài khoản</th>
                <th className="px-4 py-2.5 text-left font-medium">Trạng thái</th>
                <th className="px-4 py-2.5 text-left font-medium">Tiến độ</th>
                <th className="px-4 py-2.5 text-left font-medium">Tạo lúc</th>
                <th className="px-4 py-2.5 text-left font-medium">Hết hạn link</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {list.map((e) => {
                const a = byId.get(e.account_id);
                const s = STATUS[e.status] ?? { label: e.status, className: "bg-muted" };
                const pct = e.total_videos
                  ? Math.round((e.processed_videos / e.total_videos) * 100)
                  : 0;
                const expired = !!e.expires_at && isPast(e.expires_at);
                return (
                  <tr key={e.id} className="border-t">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <AccountAvatar
                          picture={a?.profile_picture_url}
                          platform={e.platform}
                          size="md"
                        />
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {a ? (a.page_name ?? a.name) : e.account_id}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {getPlatform(e.platform)?.label ?? e.platform}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                          s.className,
                        )}
                      >
                        {s.label}
                      </span>
                      {e.error && (
                        <p className="mt-1 max-w-56 text-xs text-destructive">{e.error}</p>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {e.total_videos > 0 ? (
                        <div className="w-36 space-y-1">
                          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${pct}%`, background: "var(--viz-series)" }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground tabular-nums">
                            {e.processed_videos}/{e.total_videos} video
                          </p>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {isRunning(e) ? "Đang đếm…" : "—"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs tabular-nums">
                      {dateTime.format(new Date(e.created_at))}
                    </td>
                    <td
                      className={cn(
                        "px-4 py-2.5 text-xs tabular-nums",
                        expired && "text-destructive",
                      )}
                    >
                      {e.expires_at ? dateTime.format(new Date(e.expires_at)) : "—"}
                      {expired && " (đã hết hạn)"}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {e.status === "completed" && !expired ? (
                        <ExportLinks id={e.id} />
                      ) : isRunning(e) ? (
                        <Loader2 className="ml-auto size-4 animate-spin text-muted-foreground" />
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <FileSpreadsheet className="size-3.5" /> Hiển thị 50 báo cáo gần nhất. Link tải là link có
        hạn do SocialAPI cấp — tải về sớm.
      </p>
    </div>
  );
}

/**
 * SocialAPI endpoints for this screen:
 *   POST /accounts/{id}/export, GET /exports, GET /exports/{id}
 */
export function ExportsPage() {
  return (
    <RequireApiKey>
      <ExportsContent />
    </RequireApiKey>
  );
}

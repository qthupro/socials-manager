import {
  ChevronDown,
  ChevronUp,
  EyeOff,
  Loader2,
  MessageCircleReply,
  Pencil,
  Plus,
  Send,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { useAccounts, type SocialAccount } from "@/features/connections";
import { getErrorMessage } from "@/shared/api";
import { AccountAvatar } from "@/shared/components/account-avatar";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Switch } from "@/shared/components/ui/switch";
import { Textarea } from "@/shared/components/ui/textarea";
import { getPlatform } from "@/shared/config/platforms";
import { cn } from "@/shared/lib/utils";

import { formatListTime, formatTime } from "../../messages/lib/format";
import {
  buildSteps,
  readSimpleRule,
  useFirings,
  useServerAutomationMutations,
  useServerAutomations,
  type ServerAutomation,
} from "./server-api";

/** Automations support Instagram (both logins) and Facebook Pages. */
const isSupported = (a: SocialAccount) => {
  const slug = getPlatform(a.platform)?.slug;
  return slug === "instagram" || slug === "facebook";
};

const lines = (s: string) =>
  s
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 10);

interface FormState {
  accountId: string;
  name: string;
  keywords: string;
  match: "contains" | "exact";
  replyTexts: string;
  privateTexts: string;
  hide: boolean;
  oncePerPerson: boolean;
}

const EMPTY: FormState = {
  accountId: "",
  name: "",
  keywords: "",
  match: "contains",
  replyTexts: "",
  privateTexts: "",
  hide: false,
  oncePerPerson: true,
};

function RuleForm({
  accounts,
  initial,
  editingId,
  onDone,
}: {
  accounts: SocialAccount[];
  initial: FormState;
  editingId?: string;
  onDone: () => void;
}) {
  const [f, setF] = useState(initial);
  const { create, update } = useServerAutomationMutations();
  const set = (patch: Partial<FormState>) => setF((x) => ({ ...x, ...patch }));
  const pending = create.isPending || update.isPending;

  const keywords = f.keywords
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean)
    .slice(0, 50);
  const replyTexts = lines(f.replyTexts);
  const privateTexts = lines(f.privateTexts);
  const hasAction = f.hide || replyTexts.length > 0 || privateTexts.length > 0;
  const canSave = !!f.accountId && hasAction && !pending;

  const save = async () => {
    const steps = buildSteps({ keywords, match: f.match, replyTexts, privateTexts, hide: f.hide });
    const name = (f.name.trim() || `Từ khoá: ${keywords.join(", ") || "mọi bình luận"}`).slice(
      0,
      100,
    );
    try {
      if (editingId) {
        await update.mutateAsync({ id: editingId, name, steps, once_per_person: f.oncePerPerson });
      } else {
        await create.mutateAsync({
          account_id: f.accountId,
          name,
          trigger: "comment",
          once_per_person: f.oncePerPerson,
          steps,
        });
      }
      toast.success(editingId ? "Đã cập nhật quy tắc" : "Đã tạo quy tắc 24/7");
      onDone();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-2.5 rounded-xl border bg-muted/30 p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <Select
          value={f.accountId}
          onValueChange={(v) => set({ accountId: v })}
          disabled={!!editingId}
        >
          <SelectTrigger size="sm" className="w-full">
            <SelectValue placeholder="Chọn tài khoản" />
          </SelectTrigger>
          <SelectContent>
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                <AccountAvatar picture={a.profile_picture_url} platform={a.platform} />
                <span className="truncate">{a.page_name ?? a.name}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          value={f.name}
          onChange={(e) => set({ name: e.target.value })}
          placeholder="Tên quy tắc (tuỳ chọn)"
          className="h-8 text-xs"
        />
      </div>

      <div className="flex gap-2">
        <Input
          value={f.keywords}
          onChange={(e) => set({ keywords: e.target.value })}
          placeholder="Từ khoá, cách nhau bởi dấu phẩy (trống = mọi bình luận)"
          className="h-8 flex-1 text-xs"
        />
        <Select value={f.match} onValueChange={(v) => set({ match: v as FormState["match"] })}>
          <SelectTrigger size="sm" className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="contains">Chứa</SelectItem>
            <SelectItem value="exact">Đúng y</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Textarea
        rows={2}
        value={f.replyTexts}
        onChange={(e) => set({ replyTexts: e.target.value })}
        placeholder="Trả lời công khai — mỗi dòng 1 mẫu, chọn ngẫu nhiên (1 lượt / lần)"
        className="min-h-0 text-xs"
      />
      <Textarea
        rows={2}
        value={f.privateTexts}
        onChange={(e) => set({ privateTexts: e.target.value })}
        placeholder="Nhắn riêng — mỗi dòng 1 mẫu (miễn phí, 1 lần / bình luận trong 7 ngày)"
        className="min-h-0 text-xs"
      />

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
        <label className="flex items-center gap-2">
          <Switch size="sm" checked={f.hide} onCheckedChange={(v) => set({ hide: v })} />
          Ẩn bình luận
        </label>
        <label className="flex items-center gap-2">
          <Switch
            size="sm"
            checked={f.oncePerPerson}
            onCheckedChange={(v) => set({ oncePerPerson: v })}
          />
          Mỗi người chỉ 1 lần
        </label>
        <div className="ml-auto flex gap-2">
          <Button variant="ghost" size="sm" onClick={onDone} disabled={pending}>
            Huỷ
          </Button>
          <Button size="sm" onClick={save} disabled={!canSave}>
            {pending && <Loader2 className="animate-spin" />}
            {editingId ? "Lưu" : "Tạo quy tắc"}
          </Button>
        </div>
      </div>
      {!hasAction && (
        <p className="text-[11px] text-muted-foreground">
          Cần ít nhất 1 hành động: trả lời, nhắn riêng hoặc ẩn.
        </p>
      )}
    </div>
  );
}

function Firings({ id }: { id: string }) {
  const firings = useFirings(id, true);
  if (firings.isLoading)
    return <Loader2 className="my-2 size-4 animate-spin text-muted-foreground" />;
  if (!firings.data?.length) {
    return (
      <p className="py-2 text-xs text-muted-foreground">Chưa chạy lần nào (30 ngày gần nhất).</p>
    );
  }
  return (
    <ul className="space-y-1 py-2">
      {firings.data.map((r) => (
        <li key={r.id} className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="text-muted-foreground">
            {formatListTime(r.created_at)} {formatTime(r.created_at)}
          </span>
          {(r.outcomes ?? []).map((o, i) => (
            <span
              key={i}
              title={o.error_code}
              className={cn(
                "rounded-full px-1.5",
                o.status === "sent"
                  ? "bg-green-500/15 text-green-700 dark:text-green-400"
                  : "bg-destructive/10 text-destructive",
              )}
            >
              {ACTION_LABEL[o.action]} {o.status === "sent" ? "✓" : "✗"}
            </span>
          ))}
        </li>
      ))}
    </ul>
  );
}

const ACTION_LABEL = {
  hide_comment: "Ẩn",
  reply_comment: "Trả lời",
  private_reply: "Nhắn riêng",
  send_dm: "Tin nhắn",
} as const;

function RuleRow({
  rule,
  account,
  onEdit,
}: {
  rule: ServerAutomation;
  account?: SocialAccount;
  onEdit?: () => void;
}) {
  const { update, remove } = useServerAutomationMutations();
  const [open, setOpen] = useState(false);
  const simple = readSimpleRule(rule);

  return (
    <li className="px-3 py-2.5">
      <div className="flex items-center gap-3">
        {account && (
          <AccountAvatar picture={account.profile_picture_url} platform={account.platform} />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{rule.name}</p>
          <p className="flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground [&_svg]:size-3">
            {simple?.hide && <EyeOff />}
            {!!simple?.replyTexts.length && <MessageCircleReply />}
            {!!simple?.privateTexts.length && <Send />}
            <span>
              Chạy {rule.fired_count} · Gửi {rule.sent_count}
              {rule.failed_count > 0 && (
                <span className="text-destructive"> · Lỗi {rule.failed_count}</span>
              )}
            </span>
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          title="Lịch sử chạy"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <ChevronUp /> : <ChevronDown />}
        </Button>
        {onEdit && (
          <Button variant="ghost" size="icon-sm" title="Sửa" onClick={onEdit}>
            <Pencil />
          </Button>
        )}
        <ConfirmDialog
          trigger={
            <Button
              variant="ghost"
              size="icon-sm"
              title="Xoá"
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 />
            </Button>
          }
          title={`Xoá "${rule.name}"?`}
          description="Quy tắc và lịch sử chạy sẽ bị xoá trên SocialAPI."
          confirmLabel="Xoá"
          onConfirm={async () => {
            await remove.mutateAsync(rule.id);
            toast.success("Đã xoá quy tắc");
          }}
        />
        <Switch
          size="sm"
          checked={rule.status === "active"}
          disabled={update.isPending}
          title={rule.status === "active" ? "Đang chạy" : "Đang tạm dừng"}
          onCheckedChange={(v) =>
            update
              .mutateAsync({ id: rule.id, status: v ? "active" : "paused" })
              .catch((err) => toast.error(getErrorMessage(err)))
          }
        />
      </div>
      {open && (
        <div className="pl-8">
          <Firings id={rule.id} />
        </div>
      )}
    </li>
  );
}

/** Server-side rules (24/7, Instagram & Facebook) managed through SocialAPI Automations. */
export function ServerAutomationsPanel() {
  const accounts = useAccounts();
  const rules = useServerAutomations();
  const [form, setForm] = useState<{ initial: FormState; editingId?: string } | null>(null);

  const supported = useMemo(() => (accounts.data ?? []).filter(isSupported), [accounts.data]);
  const byId = new Map((accounts.data ?? []).map((a) => [a.id, a]));
  const list = (rules.data ?? []).filter((r) => r.trigger === "comment");

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Quy tắc chạy trên máy chủ SocialAPI — hoạt động cả khi app tắt. Chỉ cho Instagram và
        Facebook Page. Tài khoản đã có quy tắc 24/7 đang chạy sẽ không bị tự động hoá trong app xử
        lý lặp lại.
      </p>

      {rules.isLoading ? (
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      ) : list.length > 0 ? (
        <ul className="divide-y rounded-xl border">
          {list.map((r) => {
            const simple = readSimpleRule(r);
            return (
              <RuleRow
                key={r.id}
                rule={r}
                account={byId.get(r.account_id)}
                // Multi-step flows (built elsewhere) can be paused / deleted but not edited here.
                onEdit={
                  simple
                    ? () =>
                        setForm({
                          editingId: r.id,
                          initial: {
                            accountId: r.account_id,
                            name: r.name,
                            keywords: simple.keywords.join(", "),
                            match: simple.match,
                            replyTexts: simple.replyTexts.join("\n"),
                            privateTexts: simple.privateTexts.join("\n"),
                            hide: simple.hide,
                            oncePerPerson: r.once_per_person,
                          },
                        })
                    : undefined
                }
              />
            );
          })}
        </ul>
      ) : (
        !form && (
          <p className="rounded-lg border border-dashed py-4 text-center text-xs text-muted-foreground">
            Chưa có quy tắc 24/7 nào.
          </p>
        )
      )}

      {form ? (
        <RuleForm
          key={form.editingId ?? "new"}
          accounts={supported}
          initial={form.initial}
          editingId={form.editingId}
          onDone={() => setForm(null)}
        />
      ) : supported.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Chưa kết nối Instagram hoặc Facebook Page nào.
        </p>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setForm({ initial: { ...EMPTY, accountId: supported[0].id } })}
        >
          <Plus /> Thêm quy tắc 24/7
        </Button>
      )}
    </div>
  );
}

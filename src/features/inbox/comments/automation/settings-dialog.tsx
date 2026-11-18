import {
  CircleAlert,
  CircleSlash,
  Heart,
  MessageCircleReply,
  Plus,
  Send,
  Settings2,
  Sparkles,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import { getAiProvider } from "@/shared/ai";

import { KnowledgeEditor } from "../../knowledge/knowledge-editor";
import { AppDialog, AppDialogClose } from "@/shared/components/app-dialog";
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
import { cn } from "@/shared/lib/utils";

import { formatListTime, formatTime } from "../../messages/lib/format";
import { ServerAutomationsPanel } from "./server-automations";
import {
  useCommentAutomation,
  type AutomationLogEntry,
  type AutomationSettings,
  type ReplyRule,
} from "./store";

const DELAYS = [
  { value: 0, label: "Ngay lập tức" },
  { value: 30, label: "30 giây" },
  { value: 60, label: "1 phút" },
  { value: 300, label: "5 phút" },
];

function Row({
  label,
  hint,
  checked,
  onChange,
  disabled,
  children,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="py-3">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
        <Switch size="sm" checked={checked} disabled={disabled} onCheckedChange={onChange} />
      </div>
      {checked && !disabled && children && <div className="mt-3 space-y-2">{children}</div>}
    </div>
  );
}

const pick = (s: AutomationSettings): AutomationSettings => ({
  enabled: s.enabled,
  autoLike: s.autoLike,
  autoReply: s.autoReply,
  replyMode: s.replyMode,
  rules: s.rules,
  defaultReply: s.defaultReply,
  autoPrivateReply: s.autoPrivateReply,
  privateMessage: s.privateMessage,
  delaySeconds: s.delaySeconds,
});

/** ⚙ next to the Comments heading — automation settings in a dialog. */
export function AutomationSettingsDialog() {
  const store = useCommentAutomation();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"app" | "server">("app");
  const [draft, setDraft] = useState<AutomationSettings>(() => pick(store));
  const aiAvailable = getAiProvider() !== null;

  const set = (patch: Partial<AutomationSettings>) => setDraft((d) => ({ ...d, ...patch }));
  const setRule = (id: string, patch: Partial<ReplyRule>) =>
    set({ rules: draft.rules.map((r) => (r.id === id ? { ...r, ...patch } : r)) });

  const handleOpenChange = (next: boolean) => {
    if (next) setDraft(pick(useCommentAutomation.getState()));
    setOpen(next);
  };

  const save = () => {
    store.save({
      ...draft,
      rules: draft.rules.filter((r) => r.keywords.trim() && r.reply.trim()),
    });
    setOpen(false);
    toast.success(draft.enabled ? "Đã bật tự động hoá bình luận" : "Đã lưu cài đặt");
  };

  const off = !draft.enabled;
  const noTemplates =
    draft.replyMode === "template" &&
    !draft.defaultReply.trim() &&
    !draft.rules.some((r) => r.keywords.trim() && r.reply.trim());

  return (
    <AppDialog
      open={open}
      onOpenChange={handleOpenChange}
      size="lg"
      trigger={
        <Button variant="ghost" size="icon-sm" title="Tự động hoá bình luận" className="relative">
          <Settings2 />
          {store.enabled && (
            <span className="absolute top-1 right-1 size-1.5 rounded-full bg-primary" />
          )}
        </Button>
      }
      title="Tự động hoá bình luận"
      footerNote={
        tab === "app" ? "Trả lời và nhắn riêng: mỗi lần tốn 1 lượt tương tác." : undefined
      }
      footer={
        tab === "app" ? (
          <>
            <AppDialogClose asChild>
              <Button variant="outline" size="sm">
                Huỷ
              </Button>
            </AppDialogClose>
            <Button size="sm" onClick={save}>
              Lưu
            </Button>
          </>
        ) : (
          <AppDialogClose asChild>
            <Button variant="outline" size="sm">
              Đóng
            </Button>
          </AppDialogClose>
        )
      }
    >
      <div className="flex gap-1 rounded-lg bg-muted p-0.5 text-xs">
        {(
          [
            ["app", "Trong app"],
            ["server", "24/7 · SocialAPI"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={cn(
              "flex-1 rounded-md px-2 py-1.5 font-medium text-muted-foreground",
              tab === value && "bg-background text-foreground shadow-sm",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "server" ? (
        <ServerAutomationsPanel />
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Chạy khi app đang mở (kể cả chạy nền), cho mọi kênh có bình luận. Chỉ xử lý bình luận
            mới sau khi bật.
          </p>
          <div className="divide-y rounded-xl border px-4">
            <Row
              label="Bật tự động hoá"
              hint="Tắt để tạm dừng mọi thao tác tự động"
              checked={draft.enabled}
              onChange={(v) => set({ enabled: v })}
            />

            <div className={cn("divide-y", off && "pointer-events-none opacity-50")}>
              <Row
                label="Tự động thích"
                hint="Facebook, TikTok, LinkedIn, Instagram (qua Facebook Login)"
                checked={draft.autoLike}
                disabled={off}
                onChange={(v) => set({ autoLike: v })}
              />

              <Row
                label="Tự động trả lời"
                hint="Trả lời công khai theo quy tắc từ khoá"
                checked={draft.autoReply}
                disabled={off}
                onChange={(v) => set({ autoReply: v })}
              >
                <div className="flex gap-1 rounded-lg bg-muted p-0.5 text-xs">
                  {(["template", "ai"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      disabled={mode === "ai" && !aiAvailable}
                      onClick={() => set({ replyMode: mode })}
                      className={cn(
                        "flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1 font-medium text-muted-foreground disabled:opacity-50",
                        draft.replyMode === mode && "bg-background text-foreground shadow-sm",
                      )}
                    >
                      {mode === "ai" && <Sparkles className="size-3" />}
                      {mode === "template"
                        ? "Theo mẫu"
                        : aiAvailable
                          ? "AI"
                          : "AI · chưa bật (Cài đặt → AI)"}
                    </button>
                  ))}
                </div>

                {draft.replyMode === "ai" && (
                  <div className="space-y-2 rounded-lg border p-2.5">
                    <KnowledgeEditor initialTab="comments" />
                    <p className="text-xs text-muted-foreground">
                      Quy tắc bên dưới vẫn dùng khi AI lỗi hoặc không trả lời được.
                    </p>
                  </div>
                )}

                {draft.rules.map((r) => (
                  <div key={r.id} className="space-y-1.5 rounded-lg border p-2">
                    <div className="flex gap-2">
                      <Input
                        value={r.keywords}
                        onChange={(e) => setRule(r.id, { keywords: e.target.value })}
                        placeholder="Từ khoá: giá, bao nhiêu, ship"
                        className="h-8 text-xs"
                      />
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Xoá quy tắc"
                        onClick={() => set({ rules: draft.rules.filter((x) => x.id !== r.id) })}
                      >
                        <X />
                      </Button>
                    </div>
                    <Textarea
                      rows={2}
                      value={r.reply}
                      onChange={(e) => setRule(r.id, { reply: e.target.value })}
                      placeholder="Chào {name}, giá sản phẩm là…"
                      className="min-h-0 text-xs"
                    />
                  </div>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() =>
                    set({
                      rules: [...draft.rules, { id: crypto.randomUUID(), keywords: "", reply: "" }],
                    })
                  }
                >
                  <Plus /> Thêm quy tắc
                </Button>
                <Textarea
                  rows={2}
                  value={draft.defaultReply}
                  onChange={(e) => set({ defaultReply: e.target.value })}
                  placeholder="Trả lời mặc định khi không khớp quy tắc (để trống = không trả lời)"
                  className="min-h-0 text-xs"
                />
                {noTemplates && (
                  <p className="text-xs text-amber-600">
                    Chưa có quy tắc hay câu trả lời mặc định — sẽ không có bình luận nào được trả
                    lời.
                  </p>
                )}
              </Row>

              <Row
                label="Tự động nhắn riêng"
                hint="Instagram & Facebook · mỗi bình luận 1 lần, trong 7 ngày"
                checked={draft.autoPrivateReply}
                disabled={off}
                onChange={(v) => set({ autoPrivateReply: v })}
              >
                <Textarea
                  rows={2}
                  value={draft.privateMessage}
                  onChange={(e) => set({ privateMessage: e.target.value })}
                  className="min-h-0 text-xs"
                />
              </Row>

              <div className="flex items-center justify-between gap-4 py-3">
                <div>
                  <p className="text-sm font-medium">Độ trễ</p>
                  <p className="text-xs text-muted-foreground">
                    Chờ trước khi thao tác cho tự nhiên
                  </p>
                </div>
                <Select
                  value={String(draft.delaySeconds)}
                  onValueChange={(v) => set({ delaySeconds: Number(v) })}
                  disabled={off}
                >
                  <SelectTrigger size="sm" className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DELAYS.map((d) => (
                      <SelectItem key={d.value} value={String(d.value)}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Dùng <code className="rounded bg-muted px-1">{"{name}"}</code> để chèn tên người bình
            luận. Chỉ thao tác khi nền tảng cho phép với bình luận đó.
          </p>

          <ActivityLog />
        </div>
      )}
    </AppDialog>
  );
}

const LOG_STYLE: Record<
  AutomationLogEntry["kind"],
  { icon: ReactNode; label: string; className: string }
> = {
  like: { icon: <Heart />, label: "Đã thích", className: "text-rose-500" },
  reply: { icon: <MessageCircleReply />, label: "Đã trả lời", className: "text-green-600" },
  private: { icon: <Send />, label: "Đã nhắn riêng", className: "text-sky-600" },
  skip: { icon: <CircleSlash />, label: "Bỏ qua", className: "text-muted-foreground" },
  error: { icon: <CircleAlert />, label: "Lỗi", className: "text-destructive" },
};

/** What the automation did recently — makes it visible that it's running. */
function ActivityLog() {
  const enabled = useCommentAutomation((s) => s.enabled);
  const log = useCommentAutomation((s) => s.log);
  const lastCheckAt = useCommentAutomation((s) => s.lastCheckAt);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Hoạt động gần đây
        </h4>
        <span className="text-[11px] text-muted-foreground">
          {!enabled
            ? "Đang tắt"
            : lastCheckAt
              ? `Kiểm tra lúc ${formatTime(lastCheckAt)}`
              : "Đang chờ lần kiểm tra đầu…"}
        </span>
      </div>
      {log.length === 0 ? (
        <p className="rounded-lg border border-dashed py-4 text-center text-xs text-muted-foreground">
          Chưa có hoạt động nào.
        </p>
      ) : (
        <ul className="max-h-48 divide-y overflow-y-auto rounded-lg border">
          {log.map((e, i) => {
            const style = LOG_STYLE[e.kind];
            return (
              <li key={i} className="flex items-start gap-2 px-3 py-2 text-xs">
                <span className={cn("mt-0.5 [&_svg]:size-3.5", style.className)}>{style.icon}</span>
                <div className="min-w-0 flex-1">
                  <p>
                    <span className="font-medium">{style.label}</span> · {e.subject}
                  </p>
                  {e.detail && <p className="truncate text-muted-foreground">{e.detail}</p>}
                </div>
                <span className="shrink-0 text-muted-foreground">{formatListTime(e.at)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

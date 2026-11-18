import {
  Bot,
  CircleAlert,
  Hand,
  MessageSquareReply,
  Play,
  SkipForward,
  UserPlus,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

import { useAccounts } from "@/features/connections";
import { PROVIDERS, useAiConfig, useAiReady } from "@/shared/ai";
import { AccountAvatar } from "@/shared/components/account-avatar";
import { AppDialog, AppDialogClose } from "@/shared/components/app-dialog";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";
import { Textarea } from "@/shared/components/ui/textarea";
import { cn } from "@/shared/lib/utils";

import { KnowledgeEditor } from "../../knowledge/knowledge-editor";
import { isDmPlatform } from "../lib/capabilities";
import { DEFAULT_DM_BOT, useDmBot, type DmBotLogEntry, type DmBotSettings } from "./store";

const pick = (s: DmBotSettings): DmBotSettings => ({
  enabled: s.enabled,
  allAccounts: s.allAccounts,
  accountIds: s.accountIds,
  instructions: s.instructions,
  delaySeconds: s.delaySeconds,
  handoffKeywords: s.handoffKeywords,
  humanPauseMinutes: s.humanPauseMinutes,
  maxRepliesPerDay: s.maxRepliesPerDay,
});

const LOG_ICON: Record<DmBotLogEntry["kind"], typeof Bot> = {
  reply: MessageSquareReply,
  skip: SkipForward,
  handoff: Hand,
  lead: UserPlus,
  error: CircleAlert,
};

const timeFmt = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function NumberField({
  id,
  label,
  value,
  min,
  max,
  suffix,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  suffix: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <div className="flex items-center gap-2">
        <Input
          id={id}
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Math.min(max, Math.max(min, Number(e.target.value) || 0)))}
          className="h-8 w-20"
        />
        <span className="text-xs text-muted-foreground">{suffix}</span>
      </div>
    </div>
  );
}

/** 🤖 next to the Messages heading: DM auto-reply bot settings, paused chats and activity. */
export function DmBotDialog() {
  const store = useDmBot();
  const accounts = useAccounts();
  const aiReady = useAiReady();
  const active = useAiConfig((s) => s.active);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DmBotSettings>(() => pick(store));
  const set = (patch: Partial<DmBotSettings>) => setDraft((d) => ({ ...d, ...patch }));

  const dmAccounts = (accounts.data ?? []).filter((a) => isDmPlatform(a.platform));
  const running = store.enabled && aiReady;
  const paused = Object.entries(store.paused);

  const save = () => {
    if (draft.enabled && !draft.allAccounts && draft.accountIds.length === 0) {
      toast.error("Chọn ít nhất một tài khoản cho bot.");
      return;
    }
    store.save(draft);
    toast.success(
      draft.enabled ? "Bot đã bật — chỉ trả lời tin nhắn mới từ bây giờ" : "Đã tắt bot",
    );
    setOpen(false);
  };

  return (
    <AppDialog
      open={open}
      onOpenChange={(o) => {
        if (o) setDraft(pick(useDmBot.getState()));
        setOpen(o);
      }}
      size="lg"
      trigger={
        <Button variant="ghost" size="icon-sm" title="Bot AI trả lời tin nhắn" className="relative">
          <Bot />
          <span
            className={cn(
              "absolute top-1 right-1 size-1.5 rounded-full",
              running ? "bg-green-500" : store.enabled ? "bg-amber-500" : "bg-muted-foreground/40",
            )}
          />
        </Button>
      }
      title="Bot AI trả lời tin nhắn"
      description="Tự trả lời tin nhắn mới của khách bằng AI khi app đang mở (kể cả chạy nền ở khay hệ thống)."
      footer={
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
      }
    >
      <div className="max-h-[65vh] space-y-5 overflow-y-auto pr-1">
        {!aiReady && (
          <p className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-sm">
            <CircleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />
            <span>
              Chưa cấu hình AI — bot cần API key của bạn (Claude, ChatGPT, Gemini hoặc DeepSeek).{" "}
              <Link
                to="/settings?tab=ai"
                className="font-medium text-primary hover:underline"
                onClick={() => setOpen(false)}
              >
                Mở Cài đặt → AI
              </Link>
            </span>
          </p>
        )}

        <label className="flex items-center justify-between gap-4 rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium">Bật bot</p>
            <p className="text-xs text-muted-foreground">
              {active && aiReady ? `Dùng ${PROVIDERS[active].label}. ` : ""}Mỗi tin trả lời tốn 1
              lượt tương tác SocialAPI + chi phí AI của bạn.
            </p>
          </div>
          <Switch checked={draft.enabled} onCheckedChange={(v) => set({ enabled: v })} />
        </label>

        <div className="space-y-2">
          <Label className="text-xs">Tài khoản áp dụng</Label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={draft.allAccounts}
              onCheckedChange={(v) => set({ allAccounts: !!v })}
            />
            Tất cả tài khoản nhắn tin
          </label>
          {!draft.allAccounts && (
            <div className="grid max-h-40 gap-1 overflow-y-auto rounded-lg border p-2 sm:grid-cols-2">
              {dmAccounts.map((a) => (
                <label
                  key={a.id}
                  className="flex items-center gap-2 rounded-md px-1.5 py-1 text-sm hover:bg-muted"
                >
                  <Checkbox
                    checked={draft.accountIds.includes(a.id)}
                    onCheckedChange={(v) =>
                      set({
                        accountIds: v
                          ? [...draft.accountIds, a.id]
                          : draft.accountIds.filter((x) => x !== a.id),
                      })
                    }
                  />
                  <AccountAvatar picture={a.profile_picture_url} platform={a.platform} />
                  <span className="truncate">{a.page_name ?? a.name}</span>
                </label>
              ))}
              {dmAccounts.length === 0 && (
                <p className="text-xs text-muted-foreground">Chưa có tài khoản nhắn tin nào.</p>
              )}
            </div>
          )}
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="bot-instructions" className="text-xs">
            Hướng dẫn thêm cho bot
          </Label>
          <Textarea
            id="bot-instructions"
            rows={3}
            value={draft.instructions}
            placeholder="VD: Luôn mời khách để lại số điện thoại. Không báo giá sỉ, hẹn nhân viên gọi lại."
            onChange={(e) => set({ instructions: e.target.value })}
            className="text-sm"
          />
        </div>

        <div className="rounded-lg border p-3">
          <KnowledgeEditor initialTab="messages" />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="bot-handoff" className="text-xs">
            Từ khoá chuyển cho người thật (cách nhau bằng dấu phẩy)
          </Label>
          <Input
            id="bot-handoff"
            value={draft.handoffKeywords}
            placeholder={DEFAULT_DM_BOT.handoffKeywords}
            onChange={(e) => set({ handoffKeywords: e.target.value })}
            className="h-8 text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Khách nhắn các từ này → bot ngừng ở hội thoại đó và gửi thông báo cho bạn.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <NumberField
            id="bot-delay"
            label="Chờ trước khi trả lời"
            value={draft.delaySeconds}
            min={0}
            max={600}
            suffix="giây"
            onChange={(v) => set({ delaySeconds: v })}
          />
          <NumberField
            id="bot-human"
            label="Nhường khi nhân viên vừa trả lời"
            value={draft.humanPauseMinutes}
            min={0}
            max={1440}
            suffix="phút"
            onChange={(v) => set({ humanPauseMinutes: v })}
          />
          <NumberField
            id="bot-max"
            label="Tối đa mỗi hội thoại"
            value={draft.maxRepliesPerDay}
            min={1}
            max={100}
            suffix="tin / ngày"
            onChange={(v) => set({ maxRepliesPerDay: v })}
          />
        </div>

        {paused.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs">Đang chờ người thật ({paused.length})</Label>
            <ul className="divide-y rounded-lg border">
              {paused.map(([id, p]) => (
                <li key={id} className="flex items-center gap-2 px-3 py-2 text-sm">
                  <Hand className="size-4 shrink-0 text-amber-600" />
                  <Link
                    to={`/inbox/messages?c=${encodeURIComponent(id)}`}
                    onClick={() => setOpen(false)}
                    className="min-w-0 flex-1 truncate hover:underline"
                  >
                    {p.name}
                    <span className="ml-1.5 text-xs text-muted-foreground">· {p.reason}</span>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => store.resume(id)}
                  >
                    <Play /> Cho bot trả lời lại
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-2">
          <Label className="text-xs">Hoạt động gần đây</Label>
          {store.log.length === 0 ? (
            <p className="text-xs text-muted-foreground">Chưa có hoạt động.</p>
          ) : (
            <ul className="max-h-56 divide-y overflow-y-auto rounded-lg border text-sm">
              {store.log.map((l, i) => {
                const Icon = LOG_ICON[l.kind];
                return (
                  <li key={i} className="flex items-start gap-2 px-3 py-2">
                    <Icon
                      className={cn(
                        "mt-0.5 size-3.5 shrink-0",
                        l.kind === "reply" && "text-green-600",
                        l.kind === "handoff" && "text-amber-600",
                        l.kind === "lead" && "text-primary",
                        l.kind === "error" && "text-destructive",
                        l.kind === "skip" && "text-muted-foreground",
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate">
                        <span className="font-medium">{l.subject}</span>
                        {l.detail && <span className="text-muted-foreground"> — {l.detail}</span>}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                      {timeFmt.format(new Date(l.at))}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </AppDialog>
  );
}

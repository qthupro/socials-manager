import { SlidersHorizontal } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import { AppDialog, AppDialogClose } from "@/shared/components/app-dialog";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";
import { Textarea } from "@/shared/components/ui/textarea";
import { cn } from "@/shared/lib/utils";

import {
  ASK_WHEN,
  EMOJI,
  LENGTHS,
  pickPersona,
  STANDARDS,
  TONES,
  useBotPersona,
  type PersonaSettings,
} from "./persona";

type Tab = "persona" | "standards" | "context" | "contact";
const TABS: { value: Tab; label: string }[] = [
  { value: "persona", label: "Tính cách" },
  { value: "standards", label: "Chuẩn nhân viên" },
  { value: "context", label: "Phân tích ngữ cảnh" },
  { value: "contact", label: "Xin SĐT / Zalo" },
];

function Chips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-full border px-2.5 py-0.5 text-xs transition-colors hover:bg-muted",
            value === o.value && "border-primary bg-primary/10 text-primary",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-lg border p-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

/** "Nhân viên AI" advanced settings, shared by the DM and comment bots. */
export function PersonaDialog() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("persona");
  const [d, setD] = useState<PersonaSettings>(() => pickPersona(useBotPersona.getState()));
  const set = (patch: Partial<PersonaSettings>) => setD((p) => ({ ...p, ...patch }));

  return (
    <AppDialog
      open={open}
      onOpenChange={(o) => {
        if (o) setD(pickPersona(useBotPersona.getState()));
        setOpen(o);
      }}
      size="lg"
      trigger={
        <Button type="button" variant="outline" size="sm">
          <SlidersHorizontal /> Nhân viên AI (nâng cao)
        </Button>
      }
      title="Nhân viên AI"
      description="Tính cách, chuẩn phục vụ, phân tích ngữ cảnh và xin thông tin liên hệ — dùng chung cho bot tin nhắn và bình luận."
      footer={
        <>
          <AppDialogClose asChild>
            <Button variant="outline" size="sm">
              Huỷ
            </Button>
          </AppDialogClose>
          <Button
            size="sm"
            onClick={() => {
              useBotPersona.getState().save(d);
              toast.success("Đã lưu cài đặt nhân viên AI");
              setOpen(false);
            }}
          >
            Lưu
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-1 border-b">
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTab(t.value)}
              className={cn(
                "-mb-px border-b-2 border-transparent px-2.5 py-1.5 text-sm text-muted-foreground hover:text-foreground",
                tab === t.value && "border-primary font-medium text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="max-h-[55vh] space-y-4 overflow-y-auto pr-1">
          {tab === "persona" && (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Tên nhân viên">
                  <Input
                    className="h-8"
                    placeholder="VD: Mây"
                    value={d.staffName}
                    onChange={(e) => set({ staffName: e.target.value })}
                  />
                </Field>
                <Field label="Tự xưng">
                  <Input
                    className="h-8"
                    placeholder="em / mình / shop"
                    value={d.selfPronoun}
                    onChange={(e) => set({ selfPronoun: e.target.value })}
                  />
                </Field>
                <Field label="Gọi khách">
                  <Input
                    className="h-8"
                    placeholder="auto = theo cách khách xưng"
                    value={d.customerPronoun}
                    onChange={(e) => set({ customerPronoun: e.target.value || "auto" })}
                  />
                </Field>
              </div>
              <Field label="Thái độ / giọng điệu">
                <Chips options={TONES} value={d.tone} onChange={(tone) => set({ tone })} />
              </Field>
              <Field label="Độ dài câu trả lời">
                <Chips options={LENGTHS} value={d.length} onChange={(length) => set({ length })} />
              </Field>
              <Field label="Emoji">
                <Chips options={EMOJI} value={d.emoji} onChange={(emoji) => set({ emoji })} />
              </Field>
            </>
          )}

          {tab === "standards" && (
            <>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {STANDARDS.map((s) => (
                  <label
                    key={s.id}
                    className="flex items-start gap-2 rounded-md p-1.5 text-sm hover:bg-muted"
                  >
                    <Checkbox
                      className="mt-0.5"
                      checked={d.standards.includes(s.id)}
                      onCheckedChange={(v) =>
                        set({
                          standards: v
                            ? [...d.standards, s.id]
                            : d.standards.filter((x) => x !== s.id),
                        })
                      }
                    />
                    {s.label}
                  </label>
                ))}
              </div>
              <Field label="Câu chào mở đầu (tin nhắn)">
                <Input
                  className="h-8"
                  placeholder="Dạ shop chào anh/chị ạ…"
                  value={d.greeting}
                  onChange={(e) => set({ greeting: e.target.value })}
                />
              </Field>
              <Field label="Câu kết thúc">
                <Input
                  className="h-8"
                  placeholder="Cảm ơn anh/chị đã quan tâm shop ạ!"
                  value={d.closing}
                  onChange={(e) => set({ closing: e.target.value })}
                />
              </Field>
              <Field label="Từ / chủ đề cấm nhắc tới">
                <Textarea
                  rows={2}
                  className="text-sm"
                  placeholder="VD: chính trị, tên đối thủ, cam kết hoàn tiền 100%"
                  value={d.forbidden}
                  onChange={(e) => set({ forbidden: e.target.value })}
                />
              </Field>
            </>
          )}

          {tab === "context" && (
            <>
              <Toggle
                label="Tự phân tích ngữ cảnh"
                hint="Trước khi trả lời, AI xác định ý định (hỏi giá, đặt hàng, khiếu nại…) và cảm xúc của khách; nhật ký bot ghi lại ý định."
                checked={d.analyzeContext}
                onChange={(analyzeContext) => set({ analyzeContext })}
              />
              <Toggle
                label="Chuyển người thật khi khách bức xúc"
                hint="Tin nhắn: bot trả lời xoa dịu rồi dừng, báo cho bạn. Bình luận: gửi thông báo để bạn xử lý."
                checked={d.handoffNegative}
                onChange={(handoffNegative) => set({ handoffNegative })}
              />
            </>
          )}

          {tab === "contact" && (
            <>
              <Toggle
                label="Xin thông tin liên hệ (tin nhắn)"
                hint="Bot khéo léo xin SĐT / Zalo để nhân viên tư vấn kỹ hơn — chỉ một lần, không ép."
                checked={d.askContact}
                onChange={(askContact) => set({ askContact })}
              />
              {d.askContact && (
                <>
                  <Field label="Thời điểm xin">
                    <Chips
                      options={ASK_WHEN}
                      value={d.askContactWhen}
                      onChange={(askContactWhen) => set({ askContactWhen })}
                    />
                  </Field>
                  <div className="flex flex-wrap gap-4 text-sm">
                    {(
                      [
                        ["askPhone", "Số điện thoại"],
                        ["askZalo", "Zalo"],
                        ["askName", "Tên"],
                        ["askAddress", "Địa chỉ"],
                      ] as const
                    ).map(([k, label]) => (
                      <label key={k} className="flex items-center gap-1.5">
                        <Checkbox checked={d[k]} onCheckedChange={(v) => set({ [k]: !!v })} />{" "}
                        {label}
                      </label>
                    ))}
                  </div>
                </>
              )}
              <Toggle
                label="Tự lưu vào thông tin khách hàng"
                hint="SĐT / Zalo / tên / địa chỉ khách gửi được lưu vào tab Khách hàng (không ghi đè dữ liệu bạn đã nhập) và báo cho bạn."
                checked={d.saveContact}
                onChange={(saveContact) => set({ saveContact })}
              />
              <Toggle
                label="Bình luận: mời khách nhắn tin / để lại SĐT"
                checked={d.commentInviteDm}
                onChange={(commentInviteDm) => set({ commentInviteDm })}
              />
            </>
          )}
        </div>
      </div>
    </AppDialog>
  );
}

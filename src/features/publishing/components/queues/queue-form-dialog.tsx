import { CopyCheck, Plus, X } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";

import type { Brand } from "@/features/connections";
import { getErrorMessage } from "@/shared/api";
import { AppDialog, AppDialogClose } from "@/shared/components/app-dialog";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

import {
  MAX_SLOTS,
  useCreateQueue,
  useUpdateQueue,
  WEEKDAYS,
  type Queue,
  type Slot,
  type Weekday,
} from "../../api/queues";
import { localTimezone, sortSlots, timezones, WEEKDAY_LABEL } from "../../lib/weekdays";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** A sensible starting week: 09:00 and 19:00, Monday to Friday. */
const DEFAULT_SLOTS: Slot[] = WEEKDAYS.slice(0, 5).flatMap((day) => [
  { day, time: "09:00" },
  { day, time: "19:00" },
]);

const sameSlots = (a: Slot[], b: Slot[]) =>
  a.length === b.length && sortSlots(a).every((s, i) => s.day === b[i].day && s.time === b[i].time);

/** Weekly times editor: one row per weekday, chips of HH:MM. */
function SlotsEditor({ value, onChange }: { value: Slot[]; onChange: (slots: Slot[]) => void }) {
  const [adding, setAdding] = useState<Partial<Record<Weekday, string>>>({});

  const add = (day: Weekday) => {
    const time = adding[day] ?? "";
    if (!TIME_RE.test(time)) {
      toast.error("Giờ phải có dạng HH:MM (24 giờ).");
      return;
    }
    if (value.some((s) => s.day === day && s.time === time)) return;
    if (value.length >= MAX_SLOTS) {
      toast.error(`Tối đa ${MAX_SLOTS} khung giờ mỗi tuần.`);
      return;
    }
    onChange(sortSlots([...value, { day, time }]));
    setAdding({ ...adding, [day]: "" });
  };

  /** Copy one day's times to every day. */
  const copyToAll = (day: Weekday) => {
    const times = value.filter((s) => s.day === day).map((s) => s.time);
    const next = WEEKDAYS.flatMap((d) => times.map((time) => ({ day: d, time })));
    onChange(sortSlots(next.slice(0, MAX_SLOTS)));
  };

  return (
    <div className="divide-y rounded-lg border">
      {WEEKDAYS.map((day) => {
        const times = value.filter((s) => s.day === day);
        return (
          <div key={day} className="flex flex-wrap items-center gap-1.5 px-3 py-2">
            <span className="w-16 shrink-0 text-xs font-medium">{WEEKDAY_LABEL[day].long}</span>
            {times.map((s) => (
              <span
                key={s.time}
                className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-1.5 py-0.5 text-xs text-primary tabular-nums"
              >
                {s.time}
                <button
                  type="button"
                  aria-label={`Bỏ ${s.time}`}
                  onClick={() => onChange(value.filter((x) => x !== s))}
                  className="opacity-60 hover:opacity-100"
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
            <div className="ml-auto flex items-center gap-1">
              <Input
                type="time"
                value={adding[day] ?? ""}
                onChange={(e) => setAdding({ ...adding, [day]: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    add(day);
                  }
                }}
                className="h-7 w-24 text-xs"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                title="Thêm giờ"
                onClick={() => add(day)}
              >
                <Plus />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                title="Áp dụng giờ của ngày này cho cả tuần"
                disabled={times.length === 0}
                onClick={() => copyToAll(day)}
              >
                <CopyCheck />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Create (no `queue`) or edit a Queue. */
export function QueueFormDialog({
  queue,
  brands,
  defaultBrandId,
  trigger,
}: {
  queue?: Queue;
  brands: Brand[];
  defaultBrandId?: string;
  trigger: ReactNode;
}) {
  const create = useCreateQueue();
  const update = useUpdateQueue();
  const [open, setOpen] = useState(false);
  const [brandId, setBrandId] = useState("");
  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [isDefault, setIsDefault] = useState(false);
  const [active, setActive] = useState(true);
  const [reshuffle, setReshuffle] = useState(false);

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setBrandId(queue?.brand_id ?? defaultBrandId ?? brands[0]?.id ?? "");
      setName(queue?.name ?? "");
      setTimezone(queue?.timezone ?? localTimezone());
      setSlots(queue ? sortSlots(queue.slots ?? []) : DEFAULT_SLOTS);
      setIsDefault(queue?.is_default ?? false);
      setActive(queue?.active ?? true);
      setReshuffle(false);
    }
    setOpen(next);
  };

  const timesChanged =
    !!queue && (timezone !== queue.timezone || !sameSlots(slots, sortSlots(queue.slots ?? [])));
  const busy = create.isPending || update.isPending;
  const valid = !!brandId && !!name.trim() && !!timezone && slots.length > 0;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      if (queue) {
        const res = await update.mutateAsync({
          id: queue.id,
          body: {
            ...(name.trim() !== queue.name && { name: name.trim() }),
            ...(timezone !== queue.timezone && { timezone }),
            ...(timesChanged && { slots }),
            ...(active !== queue.active && { active }),
            ...(isDefault && !queue.is_default && { is_default: true as const }),
            ...(timesChanged && reshuffle && { reshuffle_existing: true }),
          },
        });
        toast.success(
          res.reshuffled_count !== undefined
            ? `Đã lưu, xếp lại ${res.reshuffled_count} bài theo giờ mới`
            : "Đã lưu hàng đợi",
        );
      } else {
        await create.mutateAsync({
          brand_id: brandId,
          name: name.trim(),
          timezone,
          slots,
          active,
          ...(isDefault && { is_default: true }),
        });
        toast.success("Đã tạo hàng đợi");
      }
      setOpen(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <AppDialog
      open={open}
      onOpenChange={handleOpenChange}
      trigger={trigger}
      size="lg"
      title={queue ? "Sửa hàng đợi" : "Tạo hàng đợi"}
      description="Các khung giờ đăng cố định hằng tuần. Bài thêm vào hàng đợi sẽ lấy khung giờ trống sớm nhất."
      footerNote={`${slots.length}/${MAX_SLOTS} khung giờ`}
      footer={
        <>
          <AppDialogClose asChild>
            <Button variant="outline" size="sm" disabled={busy}>
              Huỷ
            </Button>
          </AppDialogClose>
          <Button size="sm" type="submit" form="queue-form" disabled={!valid || busy}>
            {queue ? "Lưu" : "Tạo hàng đợi"}
          </Button>
        </>
      }
    >
      <form id="queue-form" onSubmit={submit} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="queue-name">Tên</Label>
            <Input
              id="queue-name"
              placeholder="VD: Khung giờ vàng"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Thương hiệu</Label>
            <Select value={brandId} onValueChange={setBrandId} disabled={!!queue}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Chọn thương hiệu" />
              </SelectTrigger>
              <SelectContent>
                {brands.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="queue-tz">Múi giờ của các khung giờ</Label>
            <Input
              id="queue-tz"
              list="queue-timezones"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="font-mono text-sm"
            />
            <datalist id="queue-timezones">
              {timezones().map((tz) => (
                <option key={tz} value={tz} />
              ))}
            </datalist>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Khung giờ hằng tuần</Label>
          <SlotsEditor value={slots} onChange={setSlots} />
        </div>

        <div className="space-y-2">
          {!queue?.is_default && (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={isDefault} onCheckedChange={(v) => setIsDefault(!!v)} />
              Đặt làm hàng đợi mặc định của thương hiệu
            </label>
          )}
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={!active} onCheckedChange={(v) => setActive(!v)} />
            Tạm dừng (không nhận bài mới; bài đã xếp vẫn giữ giờ)
          </label>
          {timesChanged && (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={reshuffle} onCheckedChange={(v) => setReshuffle(!!v)} />
              Xếp lại các bài đang trong hàng đợi theo khung giờ mới
            </label>
          )}
        </div>
      </form>
    </AppDialog>
  );
}

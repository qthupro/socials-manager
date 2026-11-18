import { Pencil } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { CopyButton } from "@/shared/components/copy-button";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";

import { customerKey, platformName } from "../lib/conversation";
import { useCustomers, type CustomerInfo } from "../store/customers-store";
import type { Conversation } from "../types";

const FIELDS: {
  key: "name" | "phone" | "zalo" | "email" | "address";
  label: string;
  type?: string;
}[] = [
  { key: "name", label: "Tên gọi" },
  { key: "phone", label: "Điện thoại", type: "tel" },
  { key: "zalo", label: "Zalo", type: "tel" },
  { key: "email", label: "Email", type: "email" },
  { key: "address", label: "Địa chỉ" },
];

/** Editable info about the customer; shared by every conversation with the same person. */
export function CustomerInfoSection({ conversation: c }: { conversation: Conversation }) {
  const key = customerKey(c);
  const info = useCustomers((s) => s.customers[key]);
  const save = useCustomers((s) => s.save);
  const [draft, setDraft] = useState<CustomerInfo | null>(null);
  const editing = draft !== null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    save(key, draft);
    setDraft(null);
    toast.success("Đã lưu thông tin khách hàng");
  };

  return (
    <section>
      <div className="mb-1 flex items-center justify-between">
        <h4 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Khách hàng
        </h4>
        {!editing && (
          <Button
            variant="ghost"
            size="icon-sm"
            title="Sửa thông tin"
            aria-label="Sửa thông tin"
            onClick={() => setDraft({ ...info })}
          >
            <Pencil />
          </Button>
        )}
      </div>

      {editing ? (
        <form onSubmit={submit} className="space-y-3">
          {FIELDS.map((f) => (
            <div key={f.key} className="grid gap-1">
              <Label htmlFor={`customer-${f.key}`} className="text-xs">
                {f.label}
              </Label>
              <Input
                id={`customer-${f.key}`}
                type={f.type}
                value={draft[f.key] ?? ""}
                placeholder={f.key === "name" ? platformName(c) : undefined}
                onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                className="h-8 text-sm"
              />
            </div>
          ))}
          <div className="grid gap-1">
            <Label htmlFor="customer-note" className="text-xs">
              Ghi chú về khách
            </Label>
            <Textarea
              id="customer-note"
              rows={3}
              value={draft.note ?? ""}
              placeholder="Sở thích, size, lịch sử mua…"
              onChange={(e) => setDraft({ ...draft, note: e.target.value })}
              className="text-sm"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setDraft(null)}>
              Huỷ
            </Button>
            <Button type="submit" size="sm">
              Lưu
            </Button>
          </div>
        </form>
      ) : info ? (
        <div>
          {FIELDS.map(
            (f) =>
              info[f.key] && (
                <div key={f.key} className="flex items-center justify-between gap-2 py-1 text-sm">
                  <span className="shrink-0 text-muted-foreground">{f.label}</span>
                  <span className="flex min-w-0 items-center gap-0.5">
                    <span className="truncate" title={info[f.key]}>
                      {info[f.key]}
                    </span>
                    {(f.key === "phone" || f.key === "zalo" || f.key === "email") && (
                      <CopyButton value={info[f.key]!} />
                    )}
                  </span>
                </div>
              ),
          )}
          {info.note && (
            <p className="mt-1 rounded-md bg-muted/60 px-2 py-1.5 text-sm whitespace-pre-wrap">
              {info.note}
            </p>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setDraft({})}
          className="w-full rounded-md border border-dashed px-3 py-3 text-xs text-muted-foreground hover:bg-muted/60"
        >
          + Thêm tên gọi, số điện thoại, địa chỉ…
        </button>
      )}
    </section>
  );
}

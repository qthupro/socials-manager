import { X } from "lucide-react";
import type { ReactNode } from "react";

import { PlatformIcon } from "@/shared/components/platform-icon";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { getPlatform } from "@/shared/config/platforms";

import { contactName, customerKey, platformName } from "../lib/conversation";
import type { InboxSource } from "../lib/sources";
import { formatDayLabel } from "../lib/format";
import { useCustomers } from "../store/customers-store";
import { useInboxNotes } from "../store/notes-store";
import type { Conversation } from "../types";
import { ContactAvatar } from "./contact-avatar";
import { CustomerInfoSection } from "./customer-info";

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate text-right">{value}</span>
    </div>
  );
}

/** Right-hand details for the open conversation. */
export function ContactPanel({
  conversation: c,
  source,
  brandName,
  onClose,
}: {
  conversation: Conversation;
  /** Page / account the conversation came in on. */
  source?: InboxSource;
  brandName?: string;
  onClose: () => void;
}) {
  const platform = getPlatform(c.platform);
  const note = useInboxNotes((s) => s.notes[c.id] ?? "");
  const setNote = useInboxNotes((s) => s.setNote);
  // Re-render when the saved customer name changes (read by contactName).
  useCustomers((s) => s.customers);
  const name = contactName(c);
  const original = platformName(c);

  return (
    <aside className="flex w-72 shrink-0 flex-col border-l bg-background">
      <div className="flex h-16 shrink-0 items-center justify-between border-b px-4">
        <p className="font-medium">Thông tin liên hệ</p>
        <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Đóng">
          <X />
        </Button>
      </div>

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-4">
        <div className="flex flex-col items-center gap-2 text-center">
          <ContactAvatar
            name={name}
            picture={c.participant_picture || undefined}
            seed={c.participant_id || c.id}
            platform={c.platform}
            size="lg"
          />
          <div className="min-w-0">
            <p className="truncate font-semibold">{name}</p>
            {name !== original && (
              <p className="truncate text-xs text-muted-foreground">{original}</p>
            )}
            {c.participant_id && c.participant_id !== original && (
              <p className="truncate font-mono text-xs text-muted-foreground">{c.participant_id}</p>
            )}
          </div>
        </div>

        <CustomerInfoSection key={customerKey(c)} conversation={c} />

        <section>
          <h4 className="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Hội thoại
          </h4>
          <Row
            label="Kênh"
            value={
              <span className="inline-flex items-center gap-1.5">
                <PlatformIcon platform={c.platform} size="sm" />
                {platform?.label ?? c.platform}
              </span>
            }
          />
          {source && <Row label={source.pageId ? "Page" : "Tài khoản"} value={source.name} />}
          {brandName && <Row label="Thương hiệu" value={brandName} />}
          <Row label="Bắt đầu" value={formatDayLabel(c.created_at)} />
          <Row label="Trạng thái" value={c.status === "archived" ? "Đã lưu trữ" : "Đang mở"} />
        </section>

        <section>
          <h4 className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Ghi chú hội thoại
          </h4>
          <Textarea
            rows={5}
            value={note}
            onChange={(e) => setNote(c.id, e.target.value)}
            placeholder="Chỉ lưu trên máy này, khách không thấy…"
            className="text-sm"
          />
        </section>
      </div>
    </aside>
  );
}

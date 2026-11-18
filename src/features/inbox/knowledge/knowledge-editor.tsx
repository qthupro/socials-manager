import { MessageCircle, MessagesSquare } from "lucide-react";
import { useState } from "react";

import { Textarea } from "@/shared/components/ui/textarea";
import { cn } from "@/shared/lib/utils";

import { PersonaDialog } from "./persona-dialog";
import { useReplyKnowledge, type KnowledgeTab } from "./store";

const TABS: {
  value: KnowledgeTab;
  label: string;
  icon: typeof MessageCircle;
  hint: string;
  placeholder: string;
}[] = [
  {
    value: "messages",
    label: "Tin nhắn",
    icon: MessageCircle,
    hint: "Bot dùng khi trả lời tin nhắn riêng — có thể chi tiết: giá, size, phí ship, đổi trả, cách đặt hàng.",
    placeholder:
      "VD:\nShop thời trang Mây — áo len, váy công sở, size S–XL.\n" +
      "Giá: áo len 350–450k, váy 290–590k. Freeship đơn từ 500k.\n" +
      "Đổi trả 7 ngày nếu còn tem. Giờ làm việc 8h–21h.\n" +
      "Đặt hàng: gửi tên + SĐT + địa chỉ. Xưng “shop”, gọi khách là “bạn”.",
  },
  {
    value: "comments",
    label: "Bình luận",
    icon: MessagesSquare,
    hint: "Bot dùng khi trả lời bình luận công khai — nên ngắn gọn, mời khách nhắn tin để được tư vấn chi tiết.",
    placeholder:
      "VD:\nShop thời trang Mây. Không báo giá công khai dưới bình luận — mời khách inbox.\n" +
      "Hỏi size / màu: trả lời “Shop đã nhắn riêng cho bạn nhé”.\n" +
      "Khen sản phẩm: cảm ơn ngắn gọn, thân thiện.",
  },
];

/**
 * Business info for the auto-reply bots, one tab per channel type. Saved as you type
 * (shared by the DM bot and the comment automation dialogs).
 */
export function KnowledgeEditor({ initialTab }: { initialTab: KnowledgeTab }) {
  const [tab, setTab] = useState<KnowledgeTab>(initialTab);
  const value = useReplyKnowledge((s) => s[tab]);
  const set = useReplyKnowledge((s) => s.set);
  const current = TABS.find((t) => t.value === tab)!;

  return (
    <div className="space-y-2">
      <div className="flex items-end justify-between gap-2">
        <p className="text-xs font-medium">Thông tin doanh nghiệp cho bot</p>
        <div className="flex rounded-lg border p-0.5">
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTab(t.value)}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground",
                tab === t.value && "bg-muted font-medium text-foreground",
              )}
            >
              <t.icon className="size-3.5" /> {t.label}
            </button>
          ))}
        </div>
      </div>
      <Textarea
        key={tab}
        rows={6}
        value={value}
        placeholder={current.placeholder}
        onChange={(e) => set(tab, e.target.value)}
        className="text-sm"
      />
      <p className="text-xs text-muted-foreground">
        {current.hint} Tự lưu khi gõ. Bot chỉ dùng thông tin ở đây, không bịa thêm.
      </p>
      <PersonaDialog />
    </div>
  );
}

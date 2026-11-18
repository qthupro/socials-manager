import {
  CircleAlert,
  Cloud,
  HardDrive,
  Lightbulb,
  Radio,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

import { AppDialog, AppDialogClose } from "@/shared/components/app-dialog";
import { CopyButton } from "@/shared/components/copy-button";
import { Button } from "@/shared/components/ui/button";

/** Where WebView2 keeps this app's data on Windows (Tauri identifier folder). */
const DATA_FOLDER = String.raw`%LOCALAPPDATA%\com.socialmanager.desktop`;

function Place({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section className="flex gap-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Icon className="size-4.5" />
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <div className="space-y-1.5 text-sm">{children}</div>
      </div>
    </section>
  );
}

function Bullets({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc space-y-0.5 pl-4 text-sm marker:text-muted-foreground">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

/** "!" next to the Settings heading: plain-language explanation of where data lives. */
export function DataStorageDialog() {
  return (
    <AppDialog
      size="lg"
      trigger={
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground"
          title="Dữ liệu của bạn được lưu thế nào?"
          aria-label="Dữ liệu của bạn được lưu thế nào?"
        >
          <CircleAlert />
        </Button>
      }
      title="Dữ liệu của bạn được lưu ở đâu?"
      description="Ứng dụng không có máy chủ riêng và không gửi dữ liệu của bạn cho nhà phát triển. Mọi thứ nằm ở vài nơi dưới đây."
      footer={
        <AppDialogClose asChild>
          <Button size="sm">Đã hiểu</Button>
        </AppDialogClose>
      }
    >
      <div className="space-y-5">
        <Place
          icon={HardDrive}
          title="Trên máy tính này"
          subtitle="Chỉ máy này có, không tự đồng bộ sang máy khác"
        >
          <Bullets
            items={[
              "API key SocialAPI và key AI (Claude, OpenAI, Gemini, DeepSeek) bạn đã nhập",
              "Cài đặt bot trả lời tin nhắn / bình luận, thông tin cửa hàng cho AI",
              "Thông tin khách hàng, ghi chú bạn tự nhập trong hộp thư",
              "Giao diện sáng / tối và các tuỳ chọn nhỏ khác",
            ]}
          />
          <div className="flex items-center gap-1 rounded-lg border bg-muted/40 py-1 pr-1 pl-2.5">
            <code className="min-w-0 flex-1 truncate font-mono text-xs">{DATA_FOLDER}</code>
            <CopyButton value={DATA_FOLDER} />
          </div>
          <p className="text-xs text-muted-foreground">
            Dán đường dẫn này vào thanh địa chỉ của File Explorer để mở thư mục. Dữ liệu lưu dạng
            thường (không mã hoá) — ai dùng chung tài khoản Windows này đều có thể đọc được. Xoá thư
            mục này hoặc gỡ ứng dụng là mất hết các mục trên.
          </p>
        </Place>

        <Place
          icon={Cloud}
          title="Trên SocialAPI"
          subtitle="Dịch vụ trung gian kết nối với Facebook, Instagram, TikTok…"
        >
          <Bullets
            items={[
              "Các tài khoản mạng xã hội đã kết nối, thương hiệu",
              "Bài đăng, lịch đăng, ảnh / video đã tải lên",
              "Tin nhắn, bình luận, đánh giá, số liệu thống kê",
            ]}
          />
          <p className="text-xs text-muted-foreground">
            Ứng dụng chỉ xem và gửi các dữ liệu này qua API key của bạn, không giữ bản sao lâu dài.
            Muốn xoá hẳn thì xoá trên SocialAPI (hoặc ngắt kết nối tài khoản trong app).
          </p>
        </Place>

        <Place
          icon={Sparkles}
          title="Gửi tới AI — chỉ khi bạn dùng AI"
          subtitle="Nhà cung cấp AI bạn chọn trong tab AI"
        >
          <p>
            Khi bot hoặc nút gợi ý trả lời chạy, nội dung tin nhắn / bình luận liên quan và thông
            tin cửa hàng được gửi tới nhà cung cấp AI đó, bằng key của chính bạn. Tắt AI thì không
            gửi gì cả.
          </p>
        </Place>

        <Place
          icon={Radio}
          title="Realtime — chỉ khi bạn bật"
          subtitle="Máy chủ Convex do chính bạn tạo"
        >
          <p>
            Thông báo sự kiện từ SocialAPI (tin nhắn mới, bình luận mới…) đi qua máy chủ Convex của
            bạn để app nhận ngay. Chúng chỉ được giữ khoảng 1 ngày rồi tự xoá.
          </p>
        </Place>

        <div className="space-y-1.5 rounded-lg border bg-muted/30 p-3">
          <p className="flex items-center gap-1.5 text-sm font-medium">
            <Lightbulb className="size-4" /> Nên nhớ
          </p>
          <Bullets
            items={[
              "Đừng gửi API key cho người khác — có key là điều khiển được tài khoản của bạn.",
              "Đổi sang máy mới: cài app rồi nhập lại key và cài đặt, dữ liệu cũ không tự chuyển qua.",
              "Nghi bị lộ key: vào Nhà phát triển › API Keys để xoay vòng hoặc thu hồi ngay.",
            ]}
          />
        </div>
      </div>
    </AppDialog>
  );
}

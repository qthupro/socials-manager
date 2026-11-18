import { Trash2 } from "lucide-react";

import { deleteRealtimeWebhook } from "@/features/realtime";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { SettingsRow, SettingsSection } from "@/shared/components/settings-list";
import { Button } from "@/shared/components/ui/button";
import { clearAppStorage } from "@/shared/lib/storage";
import { autostart, setCloseToTray } from "@/shared/platform/desktop";

/** Wipes everything saved on this machine and restarts the app from the setup guide. */
async function resetApp() {
  // Best effort: the realtime webhook lives on SocialAPI and needs the key we're about to drop.
  await deleteRealtimeWebhook().catch(() => {});
  await autostart.set(false).catch(() => {});
  await setCloseToTray(false).catch(() => {});
  clearAppStorage();
  window.location.hash = "/guide";
  window.location.reload();
}

export function ResetSection() {
  return (
    <SettingsSection title="Xoá dữ liệu">
      <SettingsRow
        label="Xoá toàn bộ dữ liệu app"
        hint="Xoá sạch API key, key AI, cài đặt, bot và ghi chú lưu trên máy này để bắt đầu lại"
      >
        <ConfirmDialog
          trigger={
            <Button variant="destructive" size="sm">
              <Trash2 /> Xoá dữ liệu
            </Button>
          }
          title="Xoá toàn bộ dữ liệu app?"
          description="Mọi thứ app lưu trên máy này sẽ bị xoá và không khôi phục được. App sẽ khởi động lại như lúc mới cài."
          confirmLabel="Xoá sạch"
          onConfirm={resetApp}
        >
          <ul className="list-disc space-y-0.5 pl-4 text-sm marker:text-muted-foreground">
            <li>API key SocialAPI và key AI (Claude, ChatGPT, Gemini, DeepSeek)</li>
            <li>Cài đặt Realtime / Convex, bot trả lời, thông tin cửa hàng cho AI</li>
            <li>Thông tin khách hàng, ghi chú và các tuỳ chọn khác</li>
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            Dữ liệu trên SocialAPI (tài khoản đã kết nối, bài đăng, tin nhắn…) và Convex của bạn
            không bị xoá.
          </p>
        </ConfirmDialog>
      </SettingsRow>
    </SettingsSection>
  );
}

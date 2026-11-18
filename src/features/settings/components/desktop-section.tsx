import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { SettingsRow, SettingsSection } from "@/shared/components/settings-list";
import { Button } from "@/shared/components/ui/button";
import { Switch } from "@/shared/components/ui/switch";
import { autostart, isDesktop, notify } from "@/shared/platform/desktop";
import { useAppSettings } from "@/shared/settings/app-settings";

const AUTOSTART_KEY = ["desktop", "autostart"];

export function DesktopSection() {
  const qc = useQueryClient();
  const { runInBackground, notifyNewMessages, set } = useAppSettings();
  const desktop = isDesktop();

  // The OS login-item registration is the source of truth for autostart.
  const autostartState = useQuery({ queryKey: AUTOSTART_KEY, queryFn: autostart.isEnabled });

  const toggleAutostart = async (enabled: boolean) => {
    try {
      await autostart.set(enabled);
      await qc.invalidateQueries({ queryKey: AUTOSTART_KEY });
    } catch (err) {
      toast.error(`Không đổi được: ${String(err)}`);
    }
  };

  const testNotification = async () => {
    const error = await notify("Social Manager", "Thông báo đang hoạt động ✓");
    if (error) toast.error(`Không hiện được thông báo: ${error}`);
  };

  return (
    <SettingsSection title="Ứng dụng">
      <SettingsRow label="Chạy nền" hint="Đóng cửa sổ thì thu xuống khay hệ thống">
        <Switch
          size="sm"
          checked={runInBackground}
          disabled={!desktop}
          onCheckedChange={(v) => set({ runInBackground: v })}
        />
      </SettingsRow>
      <SettingsRow label="Khởi động cùng Windows" hint="Tự chạy khi bật máy">
        <Switch
          size="sm"
          checked={!!autostartState.data}
          disabled={!desktop || autostartState.isLoading}
          onCheckedChange={toggleAutostart}
        />
      </SettingsRow>
      <SettingsRow label="Thông báo tin nhắn mới" hint="Hiện ở góc màn hình, bấm để mở hội thoại">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-muted-foreground"
          disabled={!desktop}
          onClick={testNotification}
        >
          Thử
        </Button>
        <Switch
          size="sm"
          checked={notifyNewMessages}
          disabled={!desktop}
          onCheckedChange={(v) => set({ notifyNewMessages: v })}
        />
      </SettingsRow>
    </SettingsSection>
  );
}

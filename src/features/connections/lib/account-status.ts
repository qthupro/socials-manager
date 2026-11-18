import type { AccountStatus } from "../api/types";

const REASONS: Record<string, string> = {
  platform_unauthorized: "Nền tảng tạm từ chối truy cập",
  access_revoked: "Quyền truy cập đã bị thu hồi",
  all_pages_removed: "Không còn Page nào được cấp quyền",
  page_access_lost: "Mất quyền truy cập Page",
  posts_sync_auth_failed: "Không đồng bộ được bài đăng",
  youtube_account_suspended: "Kênh YouTube bị đình chỉ (kết nối lại không khắc phục được)",
  whatsapp_number_unavailable: "Số WhatsApp không khả dụng",
  whatsapp_number_banned: "Số WhatsApp bị cấm (kết nối lại không khắc phục được)",
  password_changed: "Mật khẩu đã thay đổi",
  session_expired: "Phiên đăng nhập hết hạn",
  invalid_access_token: "Token không hợp lệ",
  app_not_installed: "Ứng dụng đã bị gỡ khỏi tài khoản",
  user_checkpointed: "Tài khoản cần xác minh trên nền tảng",
  checkpoint_required: "Tài khoản cần xác minh trên nền tảng",
  user_not_confirmed: "Tài khoản chưa được xác nhận",
};

export const needsReconnect = (status: AccountStatus) => status !== "active";

/** Unknown reasons are shown as their raw code ("treat as a request to reconnect", per the docs). */
export function reconnectReasonLabel(reason?: string) {
  return reason ? (REASONS[reason] ?? reason) : undefined;
}

import { ApiError } from "./client";

/** Vietnamese messages for SocialAPI error codes the UI can hit. Unknown codes fall back to the API message. */
const MESSAGES: Record<string, string> = {
  "client.no_api_key": "Chưa nhập API key. Vào Cài đặt để thêm.",
  "auth.missing_header": "Thiếu API key.",
  "auth.empty_token": "API key đang trống.",
  "auth.invalid_key": "API key không hợp lệ, đã bị thu hồi hoặc đã xoay vòng.",
  "auth.invalid_token": "API key không hợp lệ hoặc đã hết hạn.",
  "auth.user_not_found": "Tài khoản SocialAPI không còn tồn tại.",
  "auth.insufficient_scope": "API key không đủ quyền cho thao tác này (cần key toàn quyền).",
  "auth.suspended": "Tài khoản SocialAPI đã bị khoá.",
  "billing.past_due": "Tài khoản SocialAPI đang quá hạn thanh toán.",
  "billing.brands_limit": "Đã đạt giới hạn số thương hiệu của gói hiện tại.",
  "billing.platform_not_available": "Nền tảng này không khả dụng với gói của bạn.",
  "account.already_linked":
    "Thương hiệu này đã có tài khoản trên nền tảng đó (mỗi thương hiệu 1 tài khoản/nền tảng).",
  "account.different_login": "Facebook của thương hiệu này đang dùng một lần đăng nhập khác.",
  "account.not_found": "Không tìm thấy tài khoản.",
  "account.reconnection_required": "Tài khoản cần kết nối lại.",
  "brand.not_found": "Không tìm thấy thương hiệu.",
  "resource.not_found": "Không tìm thấy dữ liệu.",
  "byok.credentials_missing":
    "Chưa lưu X Client ID/Secret. Vào dashboard SocialAPI › Settings › Integrations › Twitter để thêm.",
  "platform.telegram.auth": "Bot token Telegram không hợp lệ.",
  "platform.bluesky.auth_factor_required":
    "Bluesky yêu cầu mã xác thực đã gửi qua email. Nhập mã rồi thử lại.",
  "platform.app_store_connect.auth": "API key App Store Connect không hợp lệ.",
  "platform.app_store_connect.forbidden": "Key App Store Connect không đủ quyền.",
  "platform.facebook.page_cap": "Đã đạt số Facebook Page tối đa cho thương hiệu này.",
  "account.page_not_found": "Không tìm thấy Page trong tài khoản.",
  "account.page_inactive": "Page đang bị tắt.",
  "account.no_active_page": "Tài khoản chưa có Page mặc định đang hoạt động.",
  "validation.page_not_granted":
    "Tài khoản Facebook chưa cấp quyền cho Page này. Hãy kết nối lại và chọn Page trên Facebook.",
  // Inbox / DMs
  "conversation.not_found": "Không tìm thấy hội thoại.",
  "media.not_found": "Không tìm thấy tệp đính kèm (có thể chưa tải lên xong).",
  "platform.instagram.window_closed":
    "Đã quá 24 giờ kể từ tin nhắn cuối của khách, Instagram không cho trả lời.",
  "platform.facebook.window_closed":
    "Đã quá 24 giờ kể từ tin nhắn cuối của khách, Facebook không cho trả lời.",
  "whatsapp.window_closed":
    "Đã quá 24 giờ kể từ tin nhắn cuối của khách, WhatsApp chỉ cho gửi tin mẫu (template).",
  "messaging.human_agent_window_closed": "Đã quá 7 ngày, không thể trả lời hội thoại này.",
  "validation.interaction_limit_exhausted":
    "Đã hết lượt tương tác của gói trong kỳ này. Nâng cấp gói hoặc chờ kỳ mới.",
  "messaging.velocity_limit": "Gửi quá nhanh, đợi một chút rồi thử lại.",
  "messaging.recipient_limit": "Đã gửi quá nhiều tin cho người này, thử lại sau.",
  "telegram.cannot_message": "Người dùng Telegram chưa nhắn cho bot hoặc đã chặn bot.",
  "validation.attachment_unsupported": "Kênh này không hỗ trợ gửi tệp đính kèm.",
  "validation.invalid_reaction": "Reaction phải là một emoji.",
  "inbox.sync_rate_limited": "Vừa đồng bộ gần đây, mỗi 5 phút chỉ đồng bộ được 1 lần.",
  "resource.not_supported": "Kênh này không hỗ trợ thao tác này.",
  "billing.storage_quota": "Đã hết dung lượng lưu trữ media của gói.",
  // Comments
  "platform.youtube.comments_disabled": "Video này đã tắt bình luận.",
  "validation.youtube_daily_reply_limit":
    "Đã hết 5 lượt trả lời bình luận YouTube hôm nay (reset lúc 0h giờ Thái Bình Dương).",
  "platform.facebook.comment_not_hideable": "Facebook không cho ẩn bình luận này.",
  "platform.bluesky.not_thread_owner":
    "Chỉ ẩn được trả lời trong chuỗi do tài khoản của bạn bắt đầu.",
  "platform.bluesky.hidden_replies_full": "Chuỗi này đã ẩn tối đa 300 trả lời.",
  "platform.bluesky.not_own_record": "Bluesky chỉ cho xoá bình luận của chính bạn.",
  "platform.twitter.duplicate_content": "X không cho đăng trả lời trùng nội dung.",
  "platform.twitter.forbidden": "X từ chối thao tác này.",
  "platform.instagram.private_reply_ineligible":
    "Không nhắn riêng được: đã nhắn rồi, hoặc bình luận đã quá 7 ngày.",
  "platform.facebook.private_reply_ineligible":
    "Không nhắn riêng được: đã nhắn rồi, hoặc bình luận đã quá 7 ngày.",
  "validation.platform_param": "Nội dung vượt giới hạn ký tự của nền tảng.",
  "account.permission_missing": "Tài khoản chưa cấp quyền cho thao tác này. Hãy kết nối lại.",
  // Reviews / mentions
  "validation.id_invalid": "Mã đánh giá không hợp lệ.",
  "validation.id_platform_mismatch": "Đánh giá không thuộc nền tảng của tài khoản này.",
  "validation.app_store_connect_rejected":
    "Apple từ chối nội dung trả lời (đã hoàn lượt tương tác).",
  "platform.app_store_connect.rate_limit": "App Store Connect đang giới hạn tần suất, thử lại sau.",
  "validation.mention_reply_unsupported":
    "TikTok chỉ cho trả lời lượt nhắc trong bình luận, không trả lời được nhắc trong caption.",
  // Analytics / exports
  "billing.export_limit": "Đã hết lượt xuất báo cáo của gói trong kỳ này.",
  "billing.export_cooldown": "Tài khoản này vừa xuất báo cáo — cần chờ thêm theo hạn mức gói.",
  "billing.export_concurrent": "Đang có một báo cáo chạy, đợi xong rồi tạo tiếp.",
  "account.exports_not_supported": "Kênh này không hỗ trợ xuất báo cáo.",
  "account.export_enrichment_not_supported":
    "Kết nối TikTok dạng doanh nghiệp không hỗ trợ lời thoại / phân tích hình — bỏ chọn hoặc kết nối dạng creator.",
  "validation.range_too_wide": "Khoảng thời gian tối đa 400 ngày.",
  "validation.range_inverted": "Ngày bắt đầu phải trước ngày kết thúc.",
  "validation.tz_invalid": "Múi giờ không hợp lệ.",
  "platform.instagram.insights_scope_missing":
    "Instagram chưa cấp quyền xem thống kê — kết nối lại.",
  "platform.facebook.insights_scope_missing":
    "Facebook chưa cấp quyền xem thống kê Page — kết nối lại.",
  // Publishing
  "post.not_found": "Không tìm thấy bài viết.",
  "post.state_invalid": "Trạng thái hiện tại của bài không cho phép thao tác này.",
  "post.no_retryable_deliveries": "Không có kênh nào lỗi để thử lại.",
  "publishing.duplicate_target": "Một kênh bị chọn hai lần.",
  "publishing.velocity_limit": "Đăng quá nhanh, đợi một chút rồi thử lại.",
  "validation.post_limit_exhausted": "Đã hết lượt đăng bài của gói trong kỳ này.",
  "account.platform_unsupported": "Kênh này không hỗ trợ đăng bài.",
  "resource.conflict": "Bài trùng nội dung với bài đã đăng trên cùng kênh trong 24 giờ qua.",
  "queue.not_found": "Không tìm thấy hàng đợi.",
  "queue.paused": "Hàng đợi đang tạm dừng.",
  "queue.full": "Hàng đợi không còn khung giờ trống trong 366 ngày tới.",
  "queue.limit_reached": "Thương hiệu đã có tối đa 20 hàng đợi.",
  "publishing.media.url_unreachable": "Không tải được ảnh / video từ link — link phải công khai.",
  "publishing.media.untyped_url": "Không nhận ra loại tệp của link ảnh / video.",
  "publishing.media.unsupported_source": "Kênh này không nhận kiểu media đã chọn.",
  // Developer: webhooks / keys / events
  "webhook_verification_failed": "SocialAPI không gọi được URL webhook — kiểm tra URL và server.",
  "validation.body_invalid": "Dữ liệu gửi lên không hợp lệ.",
  "validation.scope_invalid": "Có scope không hợp lệ.",
  "validation.brand_invalid": "Có thương hiệu không hợp lệ hoặc không thuộc tài khoản.",
  "validation.field_invalid": "Thông tin nhập chưa đúng.",
  "validation.field_required": "Thiếu thông tin bắt buộc.",
  "system.internal": "SocialAPI đang gặp sự cố, thử lại sau.",
};

export function getErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code === "auth.insufficient_scope" && typeof err.meta?.required_scope === "string") {
      const scope = err.meta.required_scope;
      const accountWide = scope === "webhooks:manage" || scope === "analytics:read";
      return `API key thiếu quyền ${scope}${accountWide ? " (key giới hạn theo thương hiệu luôn bị từ chối quyền này)" : ""}.`;
    }
    if (err.code === "validation.field_required" && typeof err.meta?.field === "string") {
      return `Thiếu thông tin bắt buộc: ${err.meta.field}`;
    }
    if (err.code === "platform.facebook.page_cap" && typeof err.meta?.limit === "number") {
      return `Gói hiện tại cho tối đa ${err.meta.limit} Facebook Page mỗi thương hiệu.`;
    }
    // POST/PATCH /posts: one line per problem ("facebook · text: too long").
    if (err.code === "publishing.validation_failed" && Array.isArray(err.meta?.issues)) {
      const issues = (err.meta.issues as { platform?: string; field?: string; message?: string }[])
        .map((i) => [i.platform, i.field].filter(Boolean).join(" · ") + `: ${i.message ?? ""}`)
        .join("\n");
      return `Bài chưa hợp lệ:\n${issues}`;
    }
    if (err.code === "validation.field_invalid" && typeof err.meta?.field === "string") {
      return `Thông tin chưa đúng: ${err.meta.field}${err.message ? ` — ${err.message}` : ""}`;
    }
    if (err.status === 429 && !MESSAGES[err.code]) {
      return "Gọi API quá nhanh, đợi một chút rồi thử lại.";
    }
    return MESSAGES[err.code] ?? err.message;
  }
  return err instanceof Error ? err.message : String(err);
}

/**
 * Social platforms supported by SocialAPI, with how each one connects.
 * Source: https://docs.social-api.ai/platforms/overview + per-platform pages.
 */

export type PlatformSlug =
  | "instagram"
  | "facebook"
  | "threads"
  | "google"
  | "tiktok"
  | "linkedin"
  | "twitter"
  | "youtube"
  | "pinterest"
  | "zalo"
  | "whatsapp"
  | "telegram"
  | "bluesky"
  | "app_store_connect";

export interface CredentialField {
  /** Key sent inside `metadata` of POST /accounts/connect. */
  key: string;
  label: string;
  type: "text" | "password" | "textarea";
  required: boolean;
  placeholder?: string;
  help?: string;
}

export interface PlatformConfig {
  slug: PlatformSlug;
  label: string;
  color: string;
  /** oauth = consent screen in the browser; credentials = token/key typed in the app. */
  connect: "oauth" | "credentials";
  /** Only LinkedIn may hold more than one account per brand. */
  multiplePerBrand?: boolean;
  /** May need a page/location/number choice, made on the SocialAPI dashboard. */
  mayNeedSelection?: boolean;
  /** Sent as metadata.connection_type. */
  connectionTypes?: { value: string; label: string; description: string }[];
  credentialFields?: CredentialField[];
  note: string;
}

export const PLATFORMS: PlatformConfig[] = [
  {
    slug: "facebook",
    label: "Facebook",
    color: "#1877F2",
    connect: "oauth",
    mayNeedSelection: true,
    note: "Chỉ Facebook Page, không hỗ trợ trang cá nhân.",
  },
  {
    slug: "instagram",
    label: "Instagram",
    color: "#E1306C",
    connect: "oauth",
    connectionTypes: [
      { value: "", label: "Instagram Login", description: "Mặc định, không cần Facebook Page." },
      {
        value: "facebook_login",
        label: "Facebook Login",
        description: "Qua Facebook Page đã liên kết với Instagram.",
      },
    ],
    note: "Chỉ tài khoản Business hoặc Creator, không hỗ trợ tài khoản cá nhân.",
  },
  {
    slug: "threads",
    label: "Threads",
    color: "#111111",
    connect: "oauth",
    note: "Đăng nhập bằng tài khoản Threads.",
  },
  {
    slug: "tiktok",
    label: "TikTok",
    color: "#010101",
    connect: "oauth",
    connectionTypes: [
      {
        value: "business",
        label: "Business",
        description: "Mặc định, đầy đủ bình luận và lượt nhắc.",
      },
      {
        value: "creator",
        label: "Creator",
        description: "Tài khoản cá nhân/creator, không có bình luận và lượt nhắc.",
      },
    ],
    note: "Khi kết nối lại tài khoản Creator, chọn lại đúng loại Creator.",
  },
  {
    slug: "youtube",
    label: "YouTube",
    color: "#FF0000",
    connect: "oauth",
    note: "Mỗi thương hiệu 1 kênh. Nếu tài khoản Google có nhiều kênh, chỉ kênh đầu tiên vào thương hiệu này.",
  },
  {
    slug: "linkedin",
    label: "LinkedIn",
    color: "#0A66C2",
    connect: "oauth",
    multiplePerBrand: true,
    mayNeedSelection: true,
    connectionTypes: [
      { value: "profile", label: "Hồ sơ cá nhân", description: "Tài khoản thành viên LinkedIn." },
      {
        value: "organization",
        label: "Company Page",
        description: "Trang công ty, có bình luận và lượt nhắc.",
      },
    ],
    note: "Một thương hiệu có thể kết nối nhiều hồ sơ và Page LinkedIn. Token hết hạn sau 60 ngày.",
  },
  {
    slug: "twitter",
    label: "X (Twitter)",
    color: "#000000",
    connect: "oauth",
    note: "Cần lưu X Client ID/Secret trong dashboard SocialAPI (Settings › Integrations) trước khi kết nối.",
  },
  {
    slug: "pinterest",
    label: "Pinterest",
    color: "#E60023",
    connect: "oauth",
    note: "Đăng nhập bằng tài khoản Pinterest.",
  },
  {
    slug: "google",
    label: "Google Business",
    color: "#4285F4",
    connect: "oauth",
    mayNeedSelection: true,
    note: "Mỗi thương hiệu 1 địa điểm Google Business Profile.",
  },
  {
    slug: "zalo",
    label: "Zalo OA",
    color: "#0068FF",
    connect: "oauth",
    note: "Cần quyền quản trị Zalo Official Account.",
  },
  {
    slug: "whatsapp",
    label: "WhatsApp",
    color: "#25D366",
    connect: "oauth",
    mayNeedSelection: true,
    note: "Cần số WhatsApp Business (không dùng app thường) và quyền admin Meta Business.",
  },
  {
    slug: "telegram",
    label: "Telegram",
    color: "#26A5E4",
    connect: "credentials",
    credentialFields: [
      {
        key: "bot_token",
        label: "Bot token",
        type: "password",
        required: true,
        placeholder: "123456:ABC-DEF...",
        help: "Lấy từ @BotFather. Chỉ hỗ trợ tin nhắn.",
      },
    ],
    note: "Kết nối bằng bot token, chỉ dùng cho tin nhắn.",
  },
  {
    slug: "bluesky",
    label: "Bluesky",
    color: "#1185FE",
    connect: "credentials",
    credentialFields: [
      {
        key: "identifier",
        label: "Handle",
        type: "text",
        required: true,
        placeholder: "ten.bsky.social",
      },
      {
        key: "app_password",
        label: "App password",
        type: "password",
        required: true,
        help: "Tạo trong Bluesky › Settings › App passwords. Bật quyền tin nhắn nếu cần.",
      },
      {
        key: "auth_factor_token",
        label: "Mã xác thực email",
        type: "text",
        required: false,
        help: "Chỉ nhập khi Bluesky yêu cầu.",
      },
    ],
    note: "Kết nối bằng handle và App password.",
  },
  {
    slug: "app_store_connect",
    label: "App Store",
    color: "#0D96F6",
    connect: "credentials",
    credentialFields: [
      { key: "key_id", label: "Key ID", type: "text", required: true },
      {
        key: "issuer_id",
        label: "Issuer ID",
        type: "text",
        required: false,
        help: "Bắt buộc với Team key.",
      },
      {
        key: "private_key",
        label: "Private key (.p8)",
        type: "textarea",
        required: true,
        placeholder: "-----BEGIN PRIVATE KEY-----",
      },
      {
        key: "app_id",
        label: "App ID",
        type: "text",
        required: false,
        help: "Bắt buộc khi key quản lý nhiều app.",
      },
    ],
    note: "Chỉ đọc và trả lời đánh giá. Mỗi thương hiệu 1 app.",
  },
];

const BY_SLUG = new Map(PLATFORMS.map((p) => [p.slug, p]));

/** Account `platform` values that map onto a connect slug. */
const ALIASES: Record<string, PlatformSlug> = {
  instagram_fb: "instagram",
  linkedin_page: "linkedin",
  x: "twitter",
};

export function getPlatform(platform: string): PlatformConfig | undefined {
  return BY_SLUG.get((ALIASES[platform] ?? platform) as PlatformSlug);
}

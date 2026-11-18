/** Developer contact, shown in the sidebar footer and the About dialog. */
export const DEVELOPER = {
  name: "Dương Quốc Thư",
  email: "qthupro@gmail.com",
  facebook: "https://www.facebook.com/qthupro/",
  zalo: "0334244249",
  /** Opens a Zalo chat with that phone number. */
  zaloUrl: "https://zalo.me/0334244249",
};

/** Software info shown in the About dialog. */
export const APP_INFO = {
  name: "Social Manager",
  tagline: "Quản lý mạng xã hội tập trung, gọn gàng",
  description:
    "Ứng dụng desktop giúp bạn quản lý nhiều tài khoản mạng xã hội tại một nơi. Toàn bộ dữ liệu được lưu cục bộ trên máy, không cần đăng nhập.",
  version: __APP_VERSION__,
  details: [
    { label: "Giấy phép", value: "MIT" },
    { label: "Nền tảng", value: "Tauri 2 · React 19" },
  ],
  copyright: `© 2026 ${DEVELOPER.name}. All rights reserved.`,
};

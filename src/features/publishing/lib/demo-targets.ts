/**
 * DEV ONLY: fake channels to preview the target picker with 100+ entries.
 * Open /posts/new?demo in `pnpm dev`. Never used in production builds.
 */
import type { Brand } from "@/features/connections";

import type { TargetOption } from "./targets";

const CITIES = [
  "Hà Nội",
  "Hồ Chí Minh",
  "Đà Nẵng",
  "Hải Phòng",
  "Cần Thơ",
  "Nha Trang",
  "Huế",
  "Vũng Tàu",
  "Biên Hoà",
  "Quy Nhơn",
  "Đà Lạt",
  "Buôn Ma Thuột",
  "Vinh",
  "Thái Nguyên",
  "Nam Định",
];

const BRANDS = [
  { id: "demo_brand_fashion", name: "Thời trang Mây" },
  { id: "demo_brand_coffee", name: "Cà phê Sớm" },
  { id: "demo_brand_cosmetic", name: "Mỹ phẩm Lá" },
  { id: "demo_brand_empty", name: "Thương hiệu trống" },
];

/** platform → how many channels per (non-empty) brand. */
const MIX: [string, number][] = [
  ["facebook", 20],
  ["instagram", 10],
  ["tiktok", 7],
  ["threads", 3],
  ["youtube", 3],
  ["linkedin", 2],
  ["twitter", 2],
  ["zalo", 1],
  ["pinterest", 1],
];

export const DEMO_BRANDS: Brand[] = BRANDS.map((b) => ({
  ...b,
  accounts_count: 0,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
}));

export const DEMO_TARGETS: TargetOption[] = BRANDS.slice(0, 3).flatMap((brand, bi) =>
  MIX.flatMap(([platform, count]) =>
    Array.from({ length: count }, (_, i) => {
      const key = `${brand.id}_${platform}_${i}`;
      const city = CITIES[(i + bi * 4) % CITIES.length];
      return {
        key: platform === "facebook" ? `page:${key}` : `acc:${key}`,
        accountId: `demo_acc_${brand.id}_${platform}`,
        ...(platform === "facebook" && { pageId: key }),
        name: i === 0 ? brand.name : `${brand.name} ${city}${i >= CITIES.length ? ` ${i}` : ""}`,
        // Every third one without a picture, to see the platform-logo fallback.
        picture: i % 3 === 2 ? undefined : `https://picsum.photos/seed/${key}/80/80`,
        platform,
        brandId: brand.id,
      };
    }),
  ),
);

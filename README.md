# Social Manager

Ứng dụng desktop offline: **Tauri 2 (Rust)** + **React 19** + **Tailwind CSS 4** + **shadcn/ui**.
Không login, không backend — dữ liệu lưu trong `localStorage` của app.

## Tải về

Tải bản mới nhất ở trang [Releases](https://github.com/qthupro/socials-manager/releases/latest):

- **Windows:** `Social.Manager_x.y.z_x64-setup.exe` (khuyên dùng) hoặc `.msi`
- **macOS:** `.dmg` (`aarch64` cho Apple Silicon, `x64` cho Intel)
- **Linux:** `.AppImage`, `.deb` hoặc `.rpm`

> Nếu Windows hiện **"Windows protected your PC"**: bấm **More info → Run anyway**. Cảnh báo này xuất hiện
> vì bản cài chưa được ký số; dự án đang đăng ký ký số miễn phí qua SignPath Foundation.

## Yêu cầu

- Node.js LTS + pnpm
- Rust (stable) — https://rustup.rs
- Windows: WebView2 (có sẵn trên Win 10/11) + MSVC Build Tools

## Lệnh thường dùng

| Lệnh                        | Mô tả                                      |
| --------------------------- | ------------------------------------------ |
| `pnpm install`              | Cài dependency                             |
| `pnpm app:dev`              | Chạy app desktop (hot reload)              |
| `pnpm dev`                  | Chỉ chạy frontend trên trình duyệt (:1420) |
| `pnpm app:build`            | Build installer cho máy hiện tại           |
| `pnpm lint` / `pnpm format` | Kiểm tra / format code                     |
| `pnpm version:bump x.y.z`   | Đổi version ở mọi nơi                      |

## Cấu trúc

```
src/
├── app/                  # Lắp ráp app: router, registry feature, providers
│   ├── features.ts       # ★ Nơi DUY NHẤT đăng ký feature
│   └── router.tsx
├── features/             # Mỗi thư mục = 1 tính năng độc lập
│   └── home/
│       ├── index.ts      # Public API của feature (FeatureModule + export dùng chung)
│       ├── pages/        # Trang (route component)
│       ├── components/   # (thêm khi cần) UI riêng của feature
│       ├── store/        # (thêm khi cần) state + localStorage của feature
│       └── types.ts      # (thêm khi cần)
├── shared/               # Dùng chung, KHÔNG phụ thuộc feature nào
│   ├── components/ui/    # shadcn components (pnpm dlx shadcn@latest add <name>)
│   ├── lib/storage.ts    # createPersistedStore — zustand + localStorage có version
│   ├── lib/utils.ts      # cn()
│   └── types/feature.ts  # Kiểu FeatureModule
└── styles/globals.css    # Tailwind + theme tokens của shadcn

src-tauri/
├── src/lib.rs            # Khởi tạo Tauri, đăng ký command
├── src/commands/         # Rust command, mỗi domain 1 file
├── capabilities/         # Quyền truy cập API native
└── tauri.conf.json       # Version đọc từ package.json
```

### Quy tắc phụ thuộc

```
app  →  features  →  shared
```

- `shared/` không import từ `features/` hay `app/`.
- Feature này chỉ import feature khác qua `@/features/<tên>` (file `index.ts`), không import sâu vào bên trong — ESLint sẽ báo lỗi nếu vi phạm.

## Thêm một feature mới

1. Tạo `src/features/notes/pages/notes-page.tsx`.
2. Tạo `src/features/notes/index.ts`:

   ```ts
   import { NotebookPen } from "lucide-react";

   import type { FeatureModule } from "@/shared/types/feature";

   export const notesFeature: FeatureModule = {
     id: "notes",
     routes: [
       {
         path: "notes",
         lazy: async () => ({ Component: (await import("./pages/notes-page")).NotesPage }),
       },
     ],
     // Mục trên sidebar; `group` là một nhóm trong src/shared/config/navigation.ts
     nav: [{ label: "Ghi chú", path: "/notes", icon: NotebookPen, group: "publishing", order: 50 }],
   };
   ```

3. Thêm `notesFeature` vào mảng trong `src/app/features.ts`. Xong — route, mục sidebar và tiêu đề navbar tự có.

Muốn thêm nhóm mới trên sidebar: thêm vào `NAV_GROUPS` trong `src/shared/config/navigation.ts`.

## Dialog dùng chung

Dùng `AppDialog` (`src/shared/components/app-dialog.tsx`) cho mọi dialog — bọc `Dialog` chuẩn của shadcn với bố cục tiêu đề / nội dung / footer. Hộp xác nhận (xoá, ngắt kết nối…) dùng `ConfirmDialog`. Xem ví dụ ở `src/features/about/components/about-dialog.tsx`.

## Lưu dữ liệu (localStorage)

Mỗi feature có store riêng, key riêng (`social-manager:<tên>`) và `version` riêng:

```ts
// src/features/notes/store/notes-store.ts
import { createPersistedStore } from "@/shared/lib/storage";

interface NotesState {
  notes: string[];
  addNote: (note: string) => void;
}

export const useNotesStore = createPersistedStore<NotesState>(
  "notes",
  (set) => ({
    notes: [],
    addNote: (note) => set((s) => ({ notes: [...s.notes, note] })),
  }),
  { version: 1 },
);
```

Khi đổi cấu trúc dữ liệu đã lưu: tăng `version` và viết `migrate` để dữ liệu của người dùng bản cũ không bị hỏng.

## Release lên GitHub

1. `pnpm version:bump 0.2.0`
2. Cập nhật `CHANGELOG.md`
3. `git commit -am "chore: release v0.2.0"`
4. `git tag v0.2.0 && git push && git push origin v0.2.0`

GitHub Actions (`.github/workflows/release.yml`) sẽ build installer Windows / macOS / Linux và tạo **draft release**. Vào tab Releases kiểm tra rồi bấm Publish.

Quy ước version (SemVer): `MAJOR` khi thay đổi phá vỡ dữ liệu cũ, `MINOR` khi thêm tính năng, `PATCH` khi sửa lỗi.

Ảnh của trình cài đặt (icon file setup, banner NSIS / MSI) nằm trong `src-tauri/icons/installer/`.

## Code signing policy

Free code signing provided by [SignPath.io](https://about.signpath.io/), certificate by [SignPath Foundation](https://signpath.org/).

- Committers and reviewers: [qthupro](https://github.com/qthupro)
- Approvers: [qthupro](https://github.com/qthupro)

Every signed release is built from this repository by GitHub Actions; no locally built binaries are signed.

## Privacy policy

This program will not transfer any information to other networked systems unless specifically requested by the user or the person installing or operating it.

The app only talks to services the user configures themselves (social platform accounts, the AI provider whose API key they enter, and their own optional Convex deployment). There is no telemetry or analytics, and nothing is sent to the author.

## License

[MIT](LICENSE)

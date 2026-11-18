import {
  ArrowRight,
  Bot,
  Check,
  ExternalLink,
  KeyRound,
  Laptop,
  Plug,
  Radio,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";

import { useAccounts } from "@/features/connections";
import { useRealtimeConfigured } from "@/features/realtime";
import { useAiReady } from "@/shared/ai";
import { useApiKey, useMe } from "@/shared/api";
import { PageHeader } from "@/shared/components/page-header";
import { SettingsSection } from "@/shared/components/settings-list";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import { openExternal } from "@/shared/platform/opener";

import { SignupDiscountBadge, SOCIAL_API_SIGNUP_URL } from "../components/api-key-section";

interface Step {
  title: string;
  description: ReactNode;
  icon: LucideIcon;
  done: boolean;
  /** Shown under the title once done. */
  doneHint?: ReactNode;
  to: string;
  action: string;
}

function StepRow({ step, index }: { step: Step; index: number }) {
  return (
    <div className="flex items-start gap-4 px-4 py-3.5">
      <span
        className={cn(
          "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
          step.done
            ? "border-green-600 bg-green-600 text-white"
            : "border-muted-foreground/40 text-muted-foreground",
        )}
        aria-label={step.done ? "Đã cài" : "Chưa cài"}
      >
        {step.done ? <Check className="size-4" strokeWidth={3} /> : index + 1}
      </span>
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="flex items-center gap-2 text-sm font-medium">
          <step.icon className="size-4 text-muted-foreground" /> {step.title}
        </p>
        <div className="text-xs text-muted-foreground">
          {step.done && step.doneHint ? step.doneHint : step.description}
        </div>
      </div>
      <Button asChild variant={step.done ? "ghost" : "default"} size="sm" className="h-7 text-xs">
        <Link to={step.to}>
          {step.done ? "Xem" : step.action} <ArrowRight />
        </Link>
      </Button>
    </div>
  );
}

const FLOW: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: Laptop,
    title: "App trên máy bạn",
    text: "Không cần đăng nhập. Mọi key và cài đặt chỉ lưu trên máy này.",
  },
  {
    icon: KeyRound,
    title: "SocialAPI",
    text: "Cầu nối tới Facebook, Instagram, TikTok… App dùng API key của bạn để đăng bài, đọc tin nhắn, bình luận và thống kê.",
  },
  {
    icon: Bot,
    title: "AI của bạn",
    text: "Viết bài, gợi ý và tự động trả lời. App gọi thẳng tới nhà cung cấp AI bằng key của bạn.",
  },
  {
    icon: Radio,
    title: "Realtime qua Convex",
    text: "SocialAPI gửi webhook tới Convex của riêng bạn rồi đẩy về app ngay, không phải chờ kiểm tra định kỳ.",
  },
];

function HowItWorks() {
  return (
    <SettingsSection title="Cách hoạt động">
      <div className="grid gap-px bg-border sm:grid-cols-2">
        {FLOW.map((f) => (
          <div key={f.title} className="space-y-1 bg-card px-4 py-3">
            <p className="flex items-center gap-2 text-sm font-medium">
              <f.icon className="size-4 text-primary" /> {f.title}
            </p>
            <p className="text-xs text-muted-foreground">{f.text}</p>
          </div>
        ))}
      </div>
    </SettingsSection>
  );
}

/** How the app works + the setup checklist; every step is required. */
export function GuidePage() {
  const hasApiKey = useApiKey((s) => !!s.apiKey);
  const me = useMe();
  const keyOk = hasApiKey && !!me.data;
  const accounts = useAccounts(undefined, { enabled: keyOk });
  const accountCount = accounts.data?.length ?? 0;
  const aiReady = useAiReady();
  const realtimeReady = useRealtimeConfigured();

  const steps: Step[] = [
    {
      title: "Nhập API key SocialAPI",
      description: (
        <>
          <button
            type="button"
            onClick={() => openExternal(SOCIAL_API_SIGNUP_URL)}
            className="inline-flex items-center gap-1 text-primary underline-offset-2 hover:underline"
          >
            Đăng ký SocialAPI <ExternalLink className="size-3" />
          </button>{" "}
          <SignupDiscountBadge /> (nếu chưa có tài khoản), tạo key trong dashboard rồi dán vào Cài
          đặt → SocialAPI.
        </>
      ),
      doneHint: me.data ? `Đã kết nối: ${me.data.email}` : undefined,
      icon: KeyRound,
      done: keyOk,
      to: "/settings",
      action: "Nhập key",
    },
    {
      title: "Kết nối tài khoản mạng xã hội",
      description: "Kết nối ít nhất một trang / tài khoản (Facebook, Instagram, TikTok…).",
      doneHint: `${accountCount} tài khoản đã kết nối`,
      icon: Plug,
      done: accountCount > 0,
      to: "/accounts",
      action: "Kết nối",
    },
    {
      title: "Thiết lập AI",
      description:
        "Chọn nhà cung cấp (Claude, ChatGPT, Gemini…), nhập API key và bấm Kiểm tra & lưu.",
      icon: Sparkles,
      done: aiReady,
      to: "/settings?tab=ai",
      action: "Thiết lập",
    },
    {
      title: "Bật Realtime qua Convex",
      description:
        "Cài đặt → Realtime → Thiết lập: dán deploy key Production, bấm Deploy rồi bật công tắc.",
      icon: Radio,
      done: realtimeReady,
      to: "/settings",
      action: "Thiết lập",
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === steps.length;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Hướng dẫn sử dụng"
        description="Hoàn tất đủ các bước bên dưới để dùng được mọi tính năng của app."
      />

      <HowItWorks />

      <SettingsSection
        title="Các bước thiết lập"
        action={
          <span
            className={cn(
              "text-xs font-medium",
              allDone ? "text-green-600" : "text-muted-foreground",
            )}
          >
            {allDone ? "Đã cài đầy đủ ✓" : `${doneCount}/${steps.length} bước`}
          </span>
        }
      >
        <div className="h-1 bg-muted">
          <div
            className="h-full bg-green-600 transition-all"
            style={{ width: `${(doneCount / steps.length) * 100}%` }}
          />
        </div>
        {steps.map((step, i) => (
          <StepRow key={step.title} step={step} index={i} />
        ))}
      </SettingsSection>
    </div>
  );
}

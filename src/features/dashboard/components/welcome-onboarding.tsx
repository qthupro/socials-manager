import {
  ArrowRight,
  BookOpenCheck,
  Bot,
  ChartLine,
  Check,
  ExternalLink,
  KeyRound,
  MessageCircle,
  PenSquare,
  Plug,
  Send,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";

import { APP_INFO } from "@/features/about";
import { SignupDiscountBadge, SOCIAL_API_SIGNUP_URL } from "@/features/settings";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import { openExternal } from "@/shared/platform/opener";

interface Step {
  icon: LucideIcon;
  title: string;
  description: ReactNode;
  done: boolean;
  to: string;
  action: string;
}

const FEATURES: { icon: LucideIcon; title: string; text: string; to: string; color: string }[] = [
  {
    icon: Send,
    title: "Đăng & lên lịch",
    text: "Soạn một lần, đăng lên nhiều kênh cùng lúc hoặc hẹn giờ.",
    to: "/posts",
    color: "var(--tile-blue)",
  },
  {
    icon: MessageCircle,
    title: "Hộp thư hợp nhất",
    text: "Tin nhắn, bình luận, đánh giá từ mọi kênh ở một chỗ.",
    to: "/inbox/messages",
    color: "var(--tile-indigo)",
  },
  {
    icon: Bot,
    title: "Trả lời bằng AI",
    text: "Bot tự trả lời khách theo thông tin cửa hàng của bạn.",
    to: "/automations",
    color: "var(--tile-teal)",
  },
  {
    icon: ChartLine,
    title: "Thống kê",
    text: "Theo dõi tương tác, lượt xem và hiệu quả từng kênh.",
    to: "/analytics",
    color: "var(--tile-cyan)",
  },
];

function StepItem({ step, index, current }: { step: Step; index: number; current: boolean }) {
  return (
    <li
      className={cn(
        "flex items-start gap-3 rounded-lg border p-3 transition-colors",
        current ? "border-primary/40 bg-primary/5" : "bg-card",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
          step.done
            ? "border-green-600 bg-green-600 text-white"
            : current
              ? "border-primary bg-primary text-primary-foreground"
              : "border-muted-foreground/40 text-muted-foreground",
        )}
      >
        {step.done ? <Check className="size-4" strokeWidth={3} /> : index + 1}
      </span>
      <div className="min-w-0 flex-1 space-y-0.5">
        <p
          className={cn(
            "flex items-center gap-2 text-sm font-medium",
            step.done && "text-muted-foreground line-through",
          )}
        >
          <step.icon className="size-4 text-muted-foreground" /> {step.title}
        </p>
        <div className="text-xs text-muted-foreground">{step.description}</div>
      </div>
      {!step.done && (
        <Button
          asChild
          size="sm"
          variant={current ? "default" : "outline"}
          className="h-7 shrink-0 text-xs"
        >
          <Link to={step.to}>
            {step.action} <ArrowRight />
          </Link>
        </Button>
      )}
    </li>
  );
}

/** Shown on the overview instead of empty charts until a key is set and an account connected. */
export function WelcomeOnboarding({
  hasApiKey,
  hasAccounts,
}: {
  hasApiKey: boolean;
  hasAccounts: boolean;
}) {
  const steps: Step[] = [
    {
      icon: KeyRound,
      title: "Nhập API key SocialAPI",
      description: (
        <>
          Chưa có tài khoản?{" "}
          <button
            type="button"
            onClick={() => openExternal(SOCIAL_API_SIGNUP_URL)}
            className="inline-flex items-center gap-1 text-primary underline-offset-2 hover:underline"
          >
            Đăng ký SocialAPI <ExternalLink className="size-3" />
          </button>{" "}
          <SignupDiscountBadge />
        </>
      ),
      done: hasApiKey,
      to: "/settings",
      action: "Nhập key",
    },
    {
      icon: Plug,
      title: "Kết nối tài khoản mạng xã hội",
      description: "Facebook, Instagram, TikTok… kết nối ít nhất một kênh.",
      done: hasAccounts,
      to: "/accounts",
      action: "Kết nối",
    },
    {
      icon: PenSquare,
      title: "Đăng bài đầu tiên",
      description: "Số liệu tổng quan sẽ hiện ở đây sau khi bạn có bài đăng.",
      done: false,
      to: "/posts/new",
      action: "Soạn bài",
    },
  ];
  const currentIndex = steps.findIndex((s) => !s.done);
  const doneCount = steps.filter((s) => s.done).length;

  return (
    <div className="space-y-5">
      <section
        className="relative overflow-hidden rounded-2xl p-6 text-white shadow-sm sm:p-8"
        style={{
          background:
            "linear-gradient(135deg, var(--tile-blue), var(--tile-indigo) 55%, var(--tile-cyan))",
        }}
      >
        {/* Soft decorative circles. */}
        <div className="pointer-events-none absolute -top-16 -right-16 size-56 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute right-24 -bottom-20 size-40 rounded-full bg-white/10" />

        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
          <img
            src="/app-icon.svg"
            alt=""
            className="size-16 shrink-0 rounded-[22%] bg-white/15 p-1 shadow-lg ring-1 ring-white/30"
          />
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-sm font-medium text-white/80">Xin chào 👋</p>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Chào mừng đến với {APP_INFO.name}
            </h2>
            <p className="max-w-xl text-sm text-white/85">
              {APP_INFO.tagline}. Chỉ vài bước nữa là bạn có thể đăng bài, trả lời khách và xem
              thống kê của mọi kênh tại một nơi.
            </p>
          </div>
        </div>

        <div className="relative mt-6 flex flex-wrap gap-2">
          <Button
            asChild
            size="sm"
            className="border-0 bg-white text-[var(--tile-indigo)] hover:bg-white/90 dark:bg-white dark:hover:bg-white/90"
          >
            <Link to={steps[currentIndex]?.to ?? "/posts/new"}>
              {hasApiKey ? "Tiếp tục thiết lập" : "Bắt đầu ngay"} <ArrowRight />
            </Link>
          </Button>
          <Button
            asChild
            size="sm"
            variant="ghost"
            className="text-white hover:bg-white/15 hover:text-white"
          >
            <Link to="/guide">
              <BookOpenCheck /> Xem hướng dẫn
            </Link>
          </Button>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-5">
        <section className="space-y-3 rounded-xl border bg-card p-4 lg:col-span-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold">Bắt đầu trong 3 bước</h3>
              <p className="text-xs text-muted-foreground">Làm lần lượt từ trên xuống.</p>
            </div>
            <span className="text-xs font-medium text-muted-foreground">
              {doneCount}/{steps.length}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-green-600 transition-all"
              style={{ width: `${(doneCount / steps.length) * 100}%` }}
            />
          </div>
          <ol className="space-y-2">
            {steps.map((step, i) => (
              <StepItem key={step.title} step={step} index={i} current={i === currentIndex} />
            ))}
          </ol>
        </section>

        <section className="space-y-3 rounded-xl border bg-card p-4 lg:col-span-2">
          <div>
            <h3 className="text-sm font-semibold">Bạn có thể làm gì</h3>
            <p className="text-xs text-muted-foreground">Mọi kênh, một ứng dụng.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            {FEATURES.map((f) => (
              <Link
                key={f.title}
                to={f.to}
                className="group flex items-start gap-3 rounded-lg p-2 transition-colors hover:bg-muted"
              >
                <span
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg text-white"
                  style={{ background: f.color }}
                >
                  <f.icon className="size-4" />
                </span>
                <span className="min-w-0 space-y-0.5">
                  <span className="block text-sm font-medium">{f.title}</span>
                  <span className="block text-xs text-muted-foreground">{f.text}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

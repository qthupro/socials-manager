import { CircleAlert, KeyRound, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";

import { getErrorMessage, useApiKey } from "@/shared/api";
import { Button } from "@/shared/components/ui/button";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-14 text-center">
      <div className="rounded-2xl bg-primary/10 p-3 text-primary">
        <Icon className="size-6" />
      </div>
      <div className="space-y-1">
        <p className="font-medium">{title}</p>
        {description && <p className="max-w-md text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-10 text-center">
      <CircleAlert className="size-6 text-destructive" />
      <p className="max-w-md text-sm">{getErrorMessage(error)}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Thử lại
        </Button>
      )}
    </div>
  );
}

/** Renders children only when a SocialAPI key is configured; otherwise points to Settings. */
export function RequireApiKey({ children }: { children: ReactNode }) {
  const hasKey = useApiKey((s) => !!s.apiKey);
  if (hasKey) return children;

  return (
    <EmptyState
      icon={KeyRound}
      title="Chưa có API key"
      description="Nhập API key SocialAPI trong Cài đặt để bắt đầu."
      action={
        <Button asChild size="sm">
          <Link to="/settings">Đến Cài đặt</Link>
        </Button>
      }
    />
  );
}

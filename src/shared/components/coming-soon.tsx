import { Construction, type LucideIcon } from "lucide-react";

interface ComingSoonProps {
  icon?: LucideIcon;
  title: string;
  description: string;
}

/** Placeholder for screens whose functionality isn't built yet. */
export function ComingSoon({ icon: Icon = Construction, title, description }: ComingSoonProps) {
  return (
    <div className="flex h-full min-h-80 flex-col items-center justify-center gap-4 text-center">
      <div className="rounded-2xl bg-primary/10 p-4 text-primary">
        <Icon className="size-8" />
      </div>
      <div className="space-y-1.5">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      </div>
      <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
        Đang phát triển
      </span>
    </div>
  );
}

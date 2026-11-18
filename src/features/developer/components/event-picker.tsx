import { Checkbox } from "@/shared/components/ui/checkbox";
import { Skeleton } from "@/shared/components/ui/skeleton";

import type { WebhookEventInfo } from "../api/types";

const EVENT_CATEGORY_LABEL: Record<string, string> = {
  posts: "Bài đăng",
  inbox: "Hộp thư",
  accounts: "Tài khoản",
};

/** Subscribable events grouped by category, with a select-all per group. */
export function EventPicker({
  catalog,
  loading,
  value,
  onChange,
}: {
  catalog: WebhookEventInfo[];
  loading?: boolean;
  value: string[];
  onChange: (events: string[]) => void;
}) {
  if (loading) return <Skeleton className="h-56 rounded-lg" />;

  const groups = new Map<string, WebhookEventInfo[]>();
  for (const e of catalog) groups.set(e.category, [...(groups.get(e.category) ?? []), e]);
  const selected = new Set(value);

  const toggle = (events: string[], on: boolean) => {
    const next = new Set(selected);
    for (const e of events) {
      if (on) next.add(e);
      else next.delete(e);
    }
    onChange([...next]);
  };

  return (
    <div className="max-h-80 space-y-4 overflow-y-auto rounded-lg border p-3">
      {[...groups].map(([category, events]) => {
        const names = events.map((e) => e.event);
        const count = names.filter((n) => selected.has(n)).length;
        return (
          <div key={category} className="space-y-1.5">
            <label className="flex items-center gap-2 text-sm font-medium">
              <Checkbox
                checked={count === names.length ? true : count > 0 ? "indeterminate" : false}
                onCheckedChange={(v) => toggle(names, v === true)}
              />
              {EVENT_CATEGORY_LABEL[category] ?? category}
              <span className="text-xs font-normal text-muted-foreground">
                {count}/{names.length}
              </span>
            </label>
            <div className="grid gap-1 pl-6">
              {events.map((e) => (
                <label key={e.event} className="flex items-start gap-2 text-sm">
                  <Checkbox
                    className="mt-0.5"
                    checked={selected.has(e.event)}
                    onCheckedChange={(v) => toggle([e.event], v === true)}
                  />
                  <span className="min-w-0">
                    <code className="font-mono text-xs">{e.event}</code>
                    <span className="block text-xs text-muted-foreground">{e.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

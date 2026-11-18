import { PlatformIcon } from "@/shared/components/platform-icon";
import { cn } from "@/shared/lib/utils";

import { FORMATS, platformsFor, type PostFormat } from "../../lib/formats";

/** Post type cards; each lists the platforms that accept it. */
export function FormatPicker({
  value,
  onChange,
}: {
  value: PostFormat;
  onChange: (format: PostFormat) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {FORMATS.map((f) => {
        const on = f.value === value;
        return (
          <button
            key={f.value}
            type="button"
            onClick={() => onChange(f.value)}
            className={cn(
              "flex flex-col gap-2 rounded-lg border p-3 text-left transition-colors hover:bg-muted/60",
              on && "border-primary bg-primary/5 ring-1 ring-primary hover:bg-primary/10",
            )}
          >
            <div className="flex items-center gap-2">
              <f.icon className={cn("size-4", on ? "text-primary" : "text-muted-foreground")} />
              <span className="text-sm font-medium">{f.label}</span>
            </div>
            <p className="text-xs text-muted-foreground">{f.description}</p>
            <div className="flex flex-wrap gap-1">
              {platformsFor(f.value).map((p) => (
                <PlatformIcon key={p} platform={p} size="sm" className="size-4 [&_svg]:size-2.5" />
              ))}
            </div>
          </button>
        );
      })}
    </div>
  );
}

import { Check, Minus, Plug, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router";

import type { Brand } from "@/features/connections";
import { AccountAvatar } from "@/shared/components/account-avatar";
import { PlatformIcon } from "@/shared/components/platform-icon";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { getPlatform, PLATFORMS } from "@/shared/config/platforms";
import { cn } from "@/shared/lib/utils";

import type { TargetOption } from "../../lib/targets";

const ALL = "all";
/** Messaging-only platforms can't receive posts at all: never listed. */
const NOT_POSTABLE = ["whatsapp", "telegram", "app_store_connect"];
/** Selected chips shown before "+N". */
const MAX_CHIPS = 12;

const slugOf = (o: TargetOption) => getPlatform(o.platform)?.slug ?? o.platform;
const platformOrder = (slug: string) => {
  const i = PLATFORMS.findIndex((p) => p.slug === slug);
  return i < 0 ? 99 : i;
};

/** Checkbox look: on / partly on / off. */
function Tick({ state }: { state: "on" | "some" | "off" }) {
  return (
    <span
      className={cn(
        "flex size-4 shrink-0 items-center justify-center rounded border",
        state !== "off" && "border-primary bg-primary text-primary-foreground",
      )}
    >
      {state === "on" && <Check className="size-3" />}
      {state === "some" && <Minus className="size-3" />}
    </span>
  );
}

/**
 * Pick the accounts / Facebook Pages to post to. Built for many channels: search,
 * brand + platform filters, grouped by platform with "select group", a scrolling list
 * and a summary of what's selected.
 */
export function TargetPicker({
  options,
  brands,
  selected,
  onChange,
  disabledReason,
  loading,
}: {
  options: TargetOption[];
  brands: Brand[];
  selected: string[];
  onChange: (keys: string[]) => void;
  /** Why an option can't be picked for the current post type (null = it can). */
  disabledReason?: (o: TargetOption) => string | null;
  loading?: boolean;
}) {
  const [brandId, setBrandId] = useState(ALL);
  const [platform, setPlatform] = useState(ALL);
  const [query, setQuery] = useState("");
  const [showAllChips, setShowAllChips] = useState(false);

  const postableAll = useMemo(
    () => options.filter((o) => !NOT_POSTABLE.includes(slugOf(o))),
    [options],
  );
  const inBrand = useMemo(
    () => (brandId === ALL ? postableAll : postableAll.filter((o) => o.brandId === brandId)),
    [postableAll, brandId],
  );
  const q = query.trim().toLowerCase();
  const visible = inBrand.filter(
    (o) => (platform === ALL || slugOf(o) === platform) && (!q || o.name.toLowerCase().includes(q)),
  );

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const byKey = useMemo(() => new Map(options.map((o) => [o.key, o])), [options]);
  const selectedOptions = selected.map((k) => byKey.get(k)).filter(Boolean) as TargetOption[];

  // Groups per platform; a platform that can't take this post type collapses to one line.
  const groups = useMemo(() => {
    const map = new Map<string, TargetOption[]>();
    for (const o of visible) map.set(slugOf(o), [...(map.get(slugOf(o)) ?? []), o]);
    return [...map.entries()]
      .map(([slug, list]) => ({
        slug,
        list: list.sort((a, b) => a.name.localeCompare(b.name)),
        reason: disabledReason?.(list[0]) ?? null,
      }))
      .sort(
        (a, b) =>
          Number(!!a.reason) - Number(!!b.reason) || platformOrder(a.slug) - platformOrder(b.slug),
      );
  }, [visible, disabledReason]);

  /** Platform filter chips (within the brand), with counts. */
  const platformCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of inBrand) map.set(slugOf(o), (map.get(slugOf(o)) ?? 0) + 1);
    return [...map.entries()].sort((a, b) => platformOrder(a[0]) - platformOrder(b[0]));
  }, [inBrand]);

  const pickable = groups.filter((g) => !g.reason).flatMap((g) => g.list);
  const setMany = (keys: string[], on: boolean) =>
    onChange(on ? [...new Set([...selected, ...keys])] : selected.filter((k) => !keys.includes(k)));
  const stateOf = (keys: string[]) => {
    const n = keys.filter((k) => selectedSet.has(k)).length;
    return n === 0 ? "off" : n === keys.length ? "on" : "some";
  };
  const visibleState = stateOf(pickable.map((o) => o.key));

  const brand = brands.find((b) => b.id === brandId);
  const empty = !loading && inBrand.length === 0;
  const chips = showAllChips ? selectedOptions : selectedOptions.slice(0, MAX_CHIPS);

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {brands.length > 1 && (
          <Select value={brandId} onValueChange={setBrandId}>
            <SelectTrigger size="sm" className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Mọi thương hiệu ({postableAll.length})</SelectItem>
              {brands.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name} ({postableAll.filter((o) => o.brandId === b.id).length})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {inBrand.length > 6 && (
          <div className="relative min-w-48 flex-1">
            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-8 pl-8 text-sm"
              placeholder="Tìm kênh theo tên…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        )}
      </div>

      {platformCounts.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {[[ALL, inBrand.length] as const, ...platformCounts].map(([slug, count]) => (
            <button
              key={slug}
              type="button"
              onClick={() => setPlatform(slug)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs transition-colors hover:bg-muted",
                platform === slug && "border-primary bg-primary/10 text-primary",
              )}
            >
              {slug === ALL ? (
                "Tất cả"
              ) : (
                <PlatformIcon platform={slug} size="sm" className="size-4 [&_svg]:size-2.5" />
              )}
              <span className="tabular-nums">{count}</span>
            </button>
          ))}
        </div>
      )}

      {/* What's selected (also from other brands / filters). */}
      {selectedOptions.length > 0 && (
        <div className="space-y-1.5 rounded-lg bg-muted/40 p-2">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-medium">Đã chọn {selectedOptions.length} kênh</span>
            <button
              type="button"
              onClick={() => onChange([])}
              className="ml-auto text-muted-foreground hover:text-foreground"
            >
              Bỏ chọn hết
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {chips.map((o) => (
              <span
                key={o.key}
                className="inline-flex max-w-48 items-center gap-1 rounded-full border bg-background py-0.5 pr-1 pl-0.5 text-xs"
              >
                <AccountAvatar picture={o.picture} platform={o.platform} size="sm" />
                <span className="truncate">{o.name}</span>
                <button
                  type="button"
                  aria-label={`Bỏ ${o.name}`}
                  onClick={() => setMany([o.key], false)}
                  className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
            {selectedOptions.length > MAX_CHIPS && (
              <button
                type="button"
                onClick={() => setShowAllChips(!showAllChips)}
                className="rounded-full px-2 py-0.5 text-xs text-primary hover:underline"
              >
                {showAllChips ? "Thu gọn" : `+${selectedOptions.length - MAX_CHIPS} kênh`}
              </button>
            )}
          </div>
        </div>
      )}

      {empty ? (
        <div className="relative overflow-hidden rounded-lg">
          {/* Faded placeholder rows behind the backdrop. */}
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3" aria-hidden>
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="flex items-center gap-2.5 rounded-lg border px-3 py-2">
                <div className="size-8 rounded-full bg-muted" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-2.5 w-2/3 rounded bg-muted" />
                  <div className="h-2 w-1/3 rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/70 px-4 text-center backdrop-blur-[2px]">
            <Plug className="size-5 text-muted-foreground" />
            <p className="text-sm font-medium">
              {brand
                ? `Chưa có tài khoản nào trong thương hiệu “${brand.name}”`
                : "Chưa có tài khoản nào được kết nối"}
            </p>
            <p className="text-xs text-muted-foreground">
              Vui lòng kết nối tài khoản trước khi đăng bài.
            </p>
            <Button asChild size="sm">
              <Link to={brand ? `/accounts?brand=${encodeURIComponent(brand.id)}` : "/accounts"}>
                <Plug /> Kết nối tài khoản
              </Link>
            </Button>
          </div>
        </div>
      ) : loading ? (
        <div className="space-y-1.5">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-9 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <div className="flex items-center gap-2 border-b bg-muted/40 px-3 py-1.5 text-xs">
            <button
              type="button"
              disabled={pickable.length === 0}
              onClick={() =>
                setMany(
                  pickable.map((o) => o.key),
                  visibleState !== "on",
                )
              }
              className="flex items-center gap-2 disabled:opacity-50"
            >
              <Tick state={visibleState} />
              {visibleState === "on" ? "Bỏ chọn" : "Chọn"} {pickable.length} kênh đang hiện
            </button>
            {q && (
              <span className="ml-auto text-muted-foreground">
                {visible.length} kết quả cho “{query.trim()}”
              </span>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {groups.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                Không có kênh phù hợp.
              </p>
            ) : (
              groups.map((g) => {
                const label = getPlatform(g.slug)?.label ?? g.slug;
                if (g.reason) {
                  // Unsupported for this post type: one dimmed line instead of N rows.
                  return (
                    <div
                      key={g.slug}
                      className="flex items-center gap-2 border-b px-3 py-2 text-xs text-muted-foreground opacity-70 last:border-b-0"
                      title={g.reason}
                    >
                      <PlatformIcon
                        platform={g.slug}
                        size="sm"
                        className="size-4 grayscale [&_svg]:size-2.5"
                      />
                      <span className="font-medium">{label}</span>
                      <span className="tabular-nums">· {g.list.length} kênh</span>
                      <span className="ml-auto truncate">{g.reason}</span>
                    </div>
                  );
                }
                const keys = g.list.map((o) => o.key);
                const state = stateOf(keys);
                return (
                  <div key={g.slug} className="border-b last:border-b-0">
                    <button
                      type="button"
                      onClick={() => setMany(keys, state !== "on")}
                      className="sticky top-0 z-10 flex w-full items-center gap-2 bg-background/95 px-3 py-1.5 text-xs backdrop-blur hover:bg-muted/60"
                    >
                      <Tick state={state} />
                      <PlatformIcon
                        platform={g.slug}
                        size="sm"
                        className="size-4 [&_svg]:size-2.5"
                      />
                      <span className="font-medium">{label}</span>
                      <span className="text-muted-foreground tabular-nums">
                        {keys.filter((k) => selectedSet.has(k)).length}/{keys.length}
                      </span>
                    </button>
                    <div className="grid gap-x-2 px-1 pb-1 sm:grid-cols-2 xl:grid-cols-3">
                      {g.list.map((o) => {
                        const on = selectedSet.has(o.key);
                        return (
                          <button
                            key={o.key}
                            type="button"
                            onClick={() => setMany([o.key], !on)}
                            className={cn(
                              "flex h-9 min-w-0 items-center gap-2 rounded-md px-2 text-left text-sm transition-colors hover:bg-muted/60",
                              on && "bg-primary/5",
                            )}
                          >
                            <Tick state={on ? "on" : "off"} />
                            <AccountAvatar picture={o.picture} platform={o.platform} size="sm" />
                            <span className="truncate">{o.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

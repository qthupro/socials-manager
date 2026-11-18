/**
 * Small SVG charts for the analytics screen (no chart library). Specs follow the
 * dataviz skill: one series per chart (title names it, no legend box), 2px line,
 * ~10% area wash, bars ≤ 24px with a 4px rounded data-end, hairline grid, crosshair /
 * per-mark tooltip, text in text colours (never the series colour). Colour tokens:
 * --viz-series / --viz-grid / --viz-axis in globals.css (light + dark).
 */
import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from "lucide-react";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/shared/lib/utils";

import { fmtCompact, fmtFull, shortDay } from "../lib/format";

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/** Clean tick values: 0 and up to 4 round steps covering max. */
function ticks(max: number) {
  if (max <= 0) return [0, 1];
  const raw = max / 4;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? raw;
  const top = Math.ceil(max / step) * step;
  return Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
}

// ─── Stat tile ────────────────────────────────────────────────────────────────

/**
 * Label · value · delta vs the previous period (up = good for every metric here).
 * `solid` = a background colour (CSS value): white text, the delta reads by arrow + sign.
 */
export function StatTile({
  label,
  value,
  previous,
  hint,
  solid,
  icon: TileIcon,
}: {
  label: string;
  value: number;
  previous?: number;
  hint?: string;
  solid?: string;
  icon?: LucideIcon;
}) {
  const delta =
    previous === undefined
      ? undefined
      : previous === 0
        ? value > 0
          ? Infinity
          : 0
        : (value - previous) / previous;
  const up = delta !== undefined && delta > 0;
  const down = delta !== undefined && delta < 0;
  const Icon = up ? ArrowUpRight : down ? ArrowDownRight : Minus;
  return (
    <div
      className={cn(
        "space-y-1 rounded-xl border p-4",
        solid ? "border-transparent text-white shadow-sm" : "bg-card",
      )}
      style={solid ? { background: solid } : undefined}
      title={hint}
    >
      <p
        className={cn(
          "flex items-center justify-between gap-2 text-sm",
          solid ? "text-white/85" : "text-muted-foreground",
        )}
      >
        {label}
        {TileIcon && (
          <span
            className={cn(
              "rounded-lg p-1.5",
              solid ? "bg-white/15 text-white" : "bg-muted text-muted-foreground",
            )}
          >
            <TileIcon className="size-4" />
          </span>
        )}
      </p>
      <p className="text-2xl font-semibold" title={fmtFull(value)}>
        {fmtCompact(value)}
      </p>
      {delta !== undefined && (
        <p
          className={cn(
            "flex items-center gap-1 text-xs",
            solid ? "text-white/85" : "text-muted-foreground",
          )}
        >
          <span
            className={cn(
              "inline-flex items-center gap-0.5 font-medium",
              solid && "rounded-full bg-white/15 px-1.5 py-0.5 text-white",
            )}
            style={
              solid
                ? undefined
                : { color: up ? "var(--viz-delta-up)" : down ? "var(--viz-delta-down)" : undefined }
            }
          >
            <Icon className="size-3.5" />
            {delta === Infinity
              ? "mới"
              : `${solid ? (up ? "+" : down ? "−" : "") : ""}${Math.abs(delta * 100).toFixed(delta && Math.abs(delta) < 0.1 ? 1 : 0)}%`}
          </span>
          so với kỳ trước ({fmtCompact(previous!)})
        </p>
      )}
    </div>
  );
}

// ─── Time series (line or columns), one series ───────────────────────────────

const PAD = { top: 12, right: 12, bottom: 24, left: 44 };

export function TimeChart({
  data,
  kind,
  height = 220,
  label,
  tooltip,
}: {
  data: { day: string; value: number }[];
  kind: "line" | "column";
  height?: number;
  /** Metric name in the tooltip. */
  label: string;
  /** Extra tooltip rows for the hovered day. */
  tooltip?: (index: number) => ReactNode;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const n = data.length;
  const max = Math.max(0, ...data.map((d) => d.value));
  const tk = ticks(max);
  const top = tk[tk.length - 1] || 1;
  const w = Math.max(width - PAD.left - PAD.right, 1);
  const h = height - PAD.top - PAD.bottom;
  const band = w / Math.max(n, 1);
  const x = (i: number) =>
    PAD.left + (kind === "line" ? (n > 1 ? (i * w) / (n - 1) : w / 2) : band * i + band / 2);
  const y = (v: number) => PAD.top + h - (v / top) * h;
  const barW = Math.max(Math.min(24, band - 2), 1);
  // ~6 x labels whatever the range.
  const every = Math.max(1, Math.ceil(n / 6));

  const line = data.map((d, i) => `${i ? "L" : "M"}${x(i)},${y(d.value)}`).join("");
  const area = n ? `${line}L${x(n - 1)},${y(0)}L${x(0)},${y(0)}Z` : "";

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left - PAD.left;
    const i = kind === "line" ? Math.round((px / w) * (n - 1)) : Math.floor(px / band);
    setHover(i >= 0 && i < n ? i : null);
  };

  return (
    <div ref={ref} className="relative">
      {width > 0 && (
        <svg
          width={width}
          height={height}
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
          className="block touch-none"
          role="img"
          aria-label={label}
        >
          {tk.map((t) => (
            <g key={t}>
              <line
                x1={PAD.left}
                x2={PAD.left + w}
                y1={y(t)}
                y2={y(t)}
                stroke="var(--viz-grid)"
                strokeWidth={1}
              />
              <text
                x={PAD.left - 6}
                y={y(t)}
                dy="0.32em"
                textAnchor="end"
                className="fill-muted-foreground text-[10px] tabular-nums"
              >
                {fmtCompact(t)}
              </text>
            </g>
          ))}
          <line
            x1={PAD.left}
            x2={PAD.left + w}
            y1={y(0)}
            y2={y(0)}
            stroke="var(--viz-axis)"
            strokeWidth={1}
          />
          {data.map((d, i) =>
            i % every === 0 || i === n - 1 ? (
              <text
                key={d.day}
                x={x(i)}
                y={height - 6}
                textAnchor="middle"
                className="fill-muted-foreground text-[10px] tabular-nums"
              >
                {shortDay(d.day)}
              </text>
            ) : null,
          )}

          {kind === "line" ? (
            <>
              <path d={area} fill="var(--viz-series)" fillOpacity={0.1} />
              <path
                d={line}
                fill="none"
                stroke="var(--viz-series)"
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </>
          ) : (
            data.map((d, i) => {
              const bh = Math.max(y(0) - y(d.value), d.value > 0 ? 2 : 0);
              const r = Math.min(4, bh, barW / 2);
              const bx = x(i) - barW / 2;
              const by = y(0) - bh;
              // Rounded data-end, square at the baseline.
              return bh > 0 ? (
                <path
                  key={d.day}
                  d={`M${bx},${y(0)}V${by + r}Q${bx},${by} ${bx + r},${by}H${bx + barW - r}Q${bx + barW},${by} ${bx + barW},${by + r}V${y(0)}Z`}
                  fill="var(--viz-series)"
                  opacity={hover === null || hover === i ? 1 : 0.55}
                />
              ) : null;
            })
          )}

          {hover !== null && (
            <>
              {kind === "line" && (
                <>
                  <line
                    x1={x(hover)}
                    x2={x(hover)}
                    y1={PAD.top}
                    y2={y(0)}
                    stroke="var(--viz-axis)"
                    strokeWidth={1}
                  />
                  <circle
                    cx={x(hover)}
                    cy={y(data[hover].value)}
                    r={4}
                    fill="var(--viz-series)"
                    stroke="var(--card)"
                    strokeWidth={2}
                  />
                </>
              )}
            </>
          )}
        </svg>
      )}
      {hover !== null && data[hover] && (
        <div
          className="pointer-events-none absolute top-1 z-10 min-w-36 rounded-md border bg-popover px-2.5 py-1.5 text-xs shadow-md"
          style={{
            left: Math.min(Math.max(x(hover) - 72, 0), Math.max(width - 150, 0)),
          }}
        >
          <p className="text-muted-foreground">{data[hover].day.split("-").reverse().join("/")}</p>
          <p className="flex items-center gap-1.5">
            <span className="h-0.5 w-3 rounded" style={{ background: "var(--viz-series)" }} />
            <span className="font-semibold">{fmtFull(data[hover].value)}</span>
            <span className="text-muted-foreground">{label}</span>
          </p>
          {tooltip?.(hover)}
        </div>
      )}
    </div>
  );
}

// ─── Horizontal bars (magnitude by category) ─────────────────────────────────

export function BarList({
  rows,
}: {
  rows: { key: string; label: ReactNode; value: number; detail?: string }[];
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li
          key={r.key}
          className="group grid grid-cols-[minmax(0,9rem)_1fr] items-center gap-3 text-sm"
          title={r.detail}
        >
          <div className="min-w-0 truncate">{r.label}</div>
          <div className="flex items-center gap-2">
            <div className="h-3 min-w-0 flex-1">
              <div
                className="h-full rounded-r-[4px] transition-opacity group-hover:opacity-80"
                style={{
                  width: `${Math.max((r.value / max) * 100, r.value > 0 ? 1 : 0)}%`,
                  background: "var(--viz-series)",
                }}
              />
            </div>
            <span className="w-14 shrink-0 text-right text-xs tabular-nums">
              {fmtCompact(r.value)}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

// ─── Best-times heatmap (weekday × hour, one hue) ────────────────────────────

const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

export function BestTimesHeatmap({
  cells,
}: {
  cells: { weekday: number; hour: number; posts: number; avg_engagements: number }[];
}) {
  const [hover, setHover] = useState<(typeof cells)[number] | null>(null);
  const max = Math.max(1, ...cells.map((c) => c.avg_engagements));
  const at = (wd: number, h: number) => cells.find((c) => c.weekday === wd && c.hour === h);

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto">
        <div className="grid min-w-[560px] grid-cols-[2rem_repeat(24,minmax(0,1fr))] gap-0.5 text-[10px] text-muted-foreground">
          <span />
          {Array.from({ length: 24 }, (_, h) => (
            <span key={h} className="text-center tabular-nums">
              {h % 3 === 0 ? h : ""}
            </span>
          ))}
          {WEEKDAYS.map((label, i) => (
            <div key={label} className="contents">
              <span className="flex items-center">{label}</span>
              {Array.from({ length: 24 }, (_, h) => {
                const c = at(i + 1, h);
                return (
                  <button
                    key={h}
                    type="button"
                    onPointerEnter={() =>
                      setHover(c ?? { weekday: i + 1, hour: h, posts: 0, avg_engagements: 0 })
                    }
                    onFocus={() =>
                      setHover(c ?? { weekday: i + 1, hour: h, posts: 0, avg_engagements: 0 })
                    }
                    onPointerLeave={() => setHover(null)}
                    className={cn(
                      "aspect-square rounded-[3px] bg-muted outline-offset-1 hover:outline hover:outline-1 hover:outline-foreground/40",
                    )}
                    style={
                      c
                        ? {
                            background: "var(--viz-series)",
                            // One hue, light → dark: opacity carries magnitude.
                            opacity: 0.15 + 0.85 * (c.avg_engagements / max),
                          }
                        : undefined
                    }
                    aria-label={`${label} ${h}h: ${c ? `${c.posts} bài, TB ${Math.round(c.avg_engagements)} tương tác` : "chưa đăng"}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <p className="h-4 text-xs text-muted-foreground">
        {hover
          ? hover.posts
            ? `${WEEKDAYS[hover.weekday - 1]} ${hover.hour}:00–${hover.hour}:59 · ${hover.posts} bài · trung bình ${fmtFull(Math.round(hover.avg_engagements))} tương tác`
            : `${WEEKDAYS[hover.weekday - 1]} ${hover.hour}:00 · chưa có bài đăng khung giờ này`
          : "Đậm hơn = trung bình tương tác cao hơn. Ô xám = chưa đăng bài khung giờ đó."}
      </p>
    </div>
  );
}

"use client";

import { useId, useState } from "react";
import type { TrendPoint } from "@/lib/analytics";
import { useContainerWidth } from "./useContainerWidth";
import { smoothPath } from "./smoothPath";

interface Series {
  key: string;
  label: string;
  data: TrendPoint[];
  /** Tailwind stroke/fill color classes. */
  stroke: string;
  fill?: string;
  dot: string;
}

const PAD = { top: 10, right: 10, bottom: 22, left: 58 };
const H = 240;
const TICK_CLASS = "fill-zinc-400 text-[11px]";

function niceTicks(min: number, max: number, n = 4): number[] {
  if (min === max) return [min];
  const span = max - min;
  const step = Math.pow(10, Math.floor(Math.log10(span / n)));
  const err = span / n / step;
  const mult = err >= 7.5 ? 10 : err >= 3.5 ? 5 : err >= 1.5 ? 2 : 1;
  const s = step * mult;
  const ticks: number[] = [];
  for (let v = Math.ceil(min / s) * s; v <= max + 1e-9; v += s) ticks.push(v);
  return ticks;
}

export default function NetWorthChart({
  cash,
  value,
  total,
  formatValue,
}: {
  cash: TrendPoint[];
  value: TrendPoint[];
  total: TrendPoint[];
  formatValue: (v: number) => string;
}) {
  const [containerRef, measuredWidth] = useContainerWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const gradientId = useId();

  const series: Series[] = [
    { key: "cash", label: "Cash", data: cash, stroke: "stroke-sky-500 dark:stroke-sky-400", dot: "bg-sky-500 dark:bg-sky-400" },
    { key: "value", label: "Portfolio Value", data: value, stroke: "stroke-violet-500 dark:stroke-violet-400", dot: "bg-violet-500 dark:bg-violet-400" },
    { key: "total", label: "Total", data: total, stroke: "stroke-emerald-600 dark:stroke-emerald-400", fill: `url(#${gradientId})`, dot: "bg-emerald-600 dark:bg-emerald-400" },
  ];

  if (total.length === 0) {
    return (
      <p className="flex items-center justify-center py-12 text-sm text-zinc-400">
        Not enough history to chart yet.
      </p>
    );
  }

  const W = measuredWidth || 560;
  const allPoints = [...cash, ...value, ...total];
  const xs = allPoints.map((d) => d.ts);
  const ys = allPoints.map((d) => d.value);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  let yMin = Math.min(0, ...ys);
  let yMax = Math.max(...ys);
  if (yMin === yMax) {
    yMin -= 1;
    yMax += 1;
  }
  const pad = (yMax - yMin) * 0.08;
  yMin -= pad;
  yMax += pad;

  const x = (ts: number) =>
    xMax === xMin
      ? (PAD.left + W - PAD.right) / 2
      : PAD.left + ((ts - xMin) / (xMax - xMin)) * (W - PAD.left - PAD.right);
  const y = (v: number) =>
    PAD.top + (1 - (v - yMin) / (yMax - yMin)) * (H - PAD.top - PAD.bottom);

  const ticks = niceTicks(yMin, yMax);
  const dateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
  const total_ = total;
  const xTickIdx =
    total_.length <= 4
      ? total_.map((_, i) => i)
      : [0, Math.floor((total_.length - 1) / 2), total_.length - 1];

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const fx = e.clientX - rect.left;
    let best = 0;
    let bestDist = Infinity;
    total_.forEach((p, i) => {
      const dist = Math.abs(x(p.ts) - fx);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    });
    setHover(best);
  }

  const hoverTs = hover !== null ? total_[hover]?.ts : null;
  const hoverRows =
    hoverTs !== null
      ? series.map((s) => ({
          label: s.label,
          dot: s.dot,
          value: s.data.find((p) => p.ts === hoverTs)?.value ?? s.data[s.data.length - 1]?.value ?? 0,
        }))
      : null;

  return (
    <div ref={containerRef} className="relative">
      {measuredWidth > 0 && (
        <svg
          width={W}
          height={H}
          className="block"
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
          role="img"
          aria-label="Cash, portfolio value, and total over time"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-emerald-500)" stopOpacity={0.18} />
              <stop offset="100%" stopColor="var(--color-emerald-500)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={PAD.left}
                x2={W - PAD.right}
                y1={y(t)}
                y2={y(t)}
                className="stroke-zinc-200 dark:stroke-zinc-800"
                strokeWidth={1}
              />
              <text x={PAD.left - 8} y={y(t) + 3.5} textAnchor="end" className={TICK_CLASS}>
                {formatValue(t)}
              </text>
            </g>
          ))}
          {xTickIdx.map((i) => (
            <text
              key={i}
              x={Math.min(Math.max(x(total_[i].ts), PAD.left + 20), W - PAD.right - 20)}
              y={H - 6}
              textAnchor="middle"
              className={TICK_CLASS}
            >
              {dateFmt.format(new Date(total_[i].ts * 1000))}
            </text>
          ))}

          {series.map((s) => {
            if (s.data.length === 0) return null;
            const pts = s.data.map((d) => ({ x: x(d.ts), y: y(d.value) }));
            const path = smoothPath(pts);
            const bottomY = H - PAD.bottom;
            const areaPath = s.fill
              ? `${path}L${pts[pts.length - 1].x.toFixed(1)},${bottomY}L${pts[0].x.toFixed(1)},${bottomY}Z`
              : null;
            return (
              <g key={s.key}>
                {areaPath && <path d={areaPath} fill={s.fill} />}
                <path
                  d={path}
                  fill="none"
                  strokeWidth={s.key === "total" ? 2 : 1.5}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  className={s.stroke}
                />
              </g>
            );
          })}

          {hoverTs !== null && (
            <line
              x1={x(hoverTs)}
              x2={x(hoverTs)}
              y1={PAD.top}
              y2={H - PAD.bottom}
              className="stroke-zinc-300 dark:stroke-zinc-700"
              strokeWidth={1}
            />
          )}
          {hoverTs !== null &&
            series.map((s) => {
              const pt = s.data.find((p) => p.ts === hoverTs);
              if (!pt) return null;
              return (
                <circle
                  key={s.key}
                  cx={x(pt.ts)}
                  cy={y(pt.value)}
                  r={s.key === "total" ? 4.5 : 3.5}
                  className={`${s.dot} stroke-white dark:stroke-zinc-900`}
                  strokeWidth={2}
                />
              );
            })}
        </svg>
      )}
      {hoverRows && hoverTs !== null && (
        <div
          className="pointer-events-none absolute top-1 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs shadow-md dark:border-zinc-700 dark:bg-zinc-800"
          style={{ left: Math.min(Math.max(x(hoverTs), 90), W - 90) }}
        >
          <p className="mb-1 font-medium text-zinc-500 dark:text-zinc-400">
            {dateFmt.format(new Date(hoverTs * 1000))}
          </p>
          {hoverRows.map((r) => (
            <p key={r.label} className="flex items-center gap-1.5">
              <span className={`h-2 w-2 shrink-0 rounded-full ${r.dot}`} />
              <span className="text-zinc-500 dark:text-zinc-400">{r.label}</span>
              <span className="ml-auto font-medium tabular-nums">{formatValue(r.value)}</span>
            </p>
          ))}
        </div>
      )}
      <div className="mt-3 flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
        {series.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${s.dot}`} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useId, useState } from "react";
import type { TrendPoint } from "@/lib/analytics";
import { useContainerWidth } from "./useContainerWidth";

interface Props {
  data: TrendPoint[];
  height?: number;
  formatValue: (v: number) => string;
  /** Draw a horizontal reference line at this value (e.g. 0 for PnL). */
  baseline?: number;
  /** Gradient fill under the line. */
  area?: boolean;
  /** "spark": no axes/grid/tooltip — a tiny trend indication. */
  variant?: "full" | "spark";
}

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

/**
 * Monotone cubic interpolation (Fritsch–Carlson, like d3's curveMonotoneX):
 * smooth but never overshoots the data, so close-together points with big
 * jumps can't produce loops the way Catmull-Rom does.
 */
function smoothPath(pts: { x: number; y: number }[]): string {
  // Collapse duplicate x values (e.g. same-day points) to keep slopes finite.
  const p = pts.filter((pt, i) => i === 0 || pt.x > pts[i - 1].x + 1e-6);
  if (p.length === 0) return "";
  if (p.length === 1) return `M${p[0].x},${p[0].y}`;
  const n = p.length;
  const dx: number[] = [];
  const slope: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx.push(p[i + 1].x - p[i].x);
    slope.push((p[i + 1].y - p[i].y) / dx[i]);
  }
  const t: number[] = [slope[0]];
  for (let i = 1; i < n - 1; i++) {
    if (slope[i - 1] * slope[i] <= 0) {
      t.push(0);
    } else {
      const w1 = 2 * dx[i] + dx[i - 1];
      const w2 = dx[i] + 2 * dx[i - 1];
      t.push((w1 + w2) / (w1 / slope[i - 1] + w2 / slope[i]));
    }
  }
  t.push(slope[n - 2]);

  let d = `M${p[0].x.toFixed(1)},${p[0].y.toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const c1x = p[i].x + dx[i] / 3;
    const c1y = p[i].y + (t[i] * dx[i]) / 3;
    const c2x = p[i + 1].x - dx[i] / 3;
    const c2y = p[i + 1].y - (t[i + 1] * dx[i]) / 3;
    d += `C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p[i + 1].x.toFixed(1)},${p[i + 1].y.toFixed(1)}`;
  }
  return d;
}

export default function LineChart({
  data,
  height,
  formatValue,
  baseline,
  area = false,
  variant = "full",
}: Props) {
  const [containerRef, measuredWidth] = useContainerWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const gradientId = useId();

  const spark = variant === "spark";
  const PAD = spark
    ? { top: 3, right: 3, bottom: 3, left: 3 }
    : { top: 10, right: 10, bottom: 22, left: 58 };
  const H = height ?? (spark ? 44 : 200);

  if (data.length === 0) {
    return spark ? (
      <div style={{ height: H }} />
    ) : (
      <p className="flex items-center justify-center py-12 text-sm text-zinc-400">
        No closed plays in this window.
      </p>
    );
  }

  const W = measuredWidth || 560;
  const xs = data.map((d) => d.ts);
  const ys = data.map((d) => d.value);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  let yMin = Math.min(...ys, baseline ?? Infinity);
  let yMax = Math.max(...ys, baseline ?? -Infinity);
  if (yMin === yMax) {
    yMin -= 1;
    yMax += 1;
  }
  const yPadding = (yMax - yMin) * 0.08;
  yMin -= yPadding;
  yMax += yPadding;

  const x = (ts: number) =>
    xMax === xMin
      ? (PAD.left + W - PAD.right) / 2
      : PAD.left + ((ts - xMin) / (xMax - xMin)) * (W - PAD.left - PAD.right);
  const y = (v: number) =>
    PAD.top + (1 - (v - yMin) / (yMax - yMin)) * (H - PAD.top - PAD.bottom);

  const pts = data.map((d) => ({ x: x(d.ts), y: y(d.value) }));
  const path = smoothPath(pts);
  const bottomY = H - PAD.bottom;
  const areaPath = `${path}L${pts[pts.length - 1].x.toFixed(1)},${bottomY}L${pts[0].x.toFixed(1)},${bottomY}Z`;

  const ticks = spark ? [] : niceTicks(yMin, yMax);
  const dateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
  const xTickIdx = spark
    ? []
    : data.length <= 4
      ? data.map((_, i) => i)
      : [0, Math.floor((data.length - 1) / 2), data.length - 1];

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    if (spark) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const fx = e.clientX - rect.left;
    let best = 0;
    let bestDist = Infinity;
    pts.forEach((p, i) => {
      const dist = Math.abs(p.x - fx);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    });
    setHover(best);
  }

  const h = !spark && hover !== null ? data[hover] : null;

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
          aria-label="Line chart"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-emerald-500)" stopOpacity={0.22} />
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
          {!spark && baseline !== undefined && baseline >= yMin && baseline <= yMax && (
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(baseline)}
              y2={y(baseline)}
              className="stroke-zinc-400 dark:stroke-zinc-600"
              strokeWidth={1}
              strokeDasharray="4 3"
            />
          )}
          {xTickIdx.map((i) => (
            <text
              key={i}
              x={Math.min(Math.max(x(data[i].ts), PAD.left + 20), W - PAD.right - 20)}
              y={H - 6}
              textAnchor="middle"
              className={TICK_CLASS}
            >
              {dateFmt.format(new Date(data[i].ts * 1000))}
            </text>
          ))}
          {area && <path d={areaPath} fill={`url(#${gradientId})`} />}
          <path
            d={path}
            fill="none"
            strokeWidth={1.5}
            strokeLinejoin="round"
            strokeLinecap="round"
            className="stroke-emerald-600 dark:stroke-emerald-400"
          />
          {h && (
            <>
              <line
                x1={x(h.ts)}
                x2={x(h.ts)}
                y1={PAD.top}
                y2={H - PAD.bottom}
                className="stroke-zinc-300 dark:stroke-zinc-700"
                strokeWidth={1}
              />
              <circle
                cx={x(h.ts)}
                cy={y(h.value)}
                r={4}
                className="fill-emerald-600 stroke-white dark:fill-emerald-400 dark:stroke-zinc-900"
                strokeWidth={2}
              />
            </>
          )}
        </svg>
      )}
      {h && (
        <div
          className="pointer-events-none absolute top-1 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs shadow-md dark:border-zinc-700 dark:bg-zinc-800"
          style={{ left: Math.min(Math.max(x(h.ts), 70), W - 70) }}
        >
          <span className="text-zinc-400">{dateFmt.format(new Date(h.ts * 1000))}</span>{" "}
          <span className="font-medium tabular-nums">{formatValue(h.value)}</span>
        </div>
      )}
    </div>
  );
}

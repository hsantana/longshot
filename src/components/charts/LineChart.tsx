"use client";

import { useRef, useState } from "react";
import type { TrendPoint } from "@/lib/analytics";

interface Props {
  data: TrendPoint[];
  height?: number;
  formatValue: (v: number) => string;
  /** Draw a horizontal reference line at this value (e.g. 0 for PnL). */
  baseline?: number;
}

const W = 640;
const PAD = { top: 12, right: 12, bottom: 24, left: 56 };

function niceTicks(min: number, max: number, n = 4): number[] {
  if (min === max) {
    return [min];
  }
  const span = max - min;
  const step = Math.pow(10, Math.floor(Math.log10(span / n)));
  const err = (span / n) / step;
  const mult = err >= 7.5 ? 10 : err >= 3.5 ? 5 : err >= 1.5 ? 2 : 1;
  const s = step * mult;
  const ticks: number[] = [];
  for (let v = Math.ceil(min / s) * s; v <= max + 1e-9; v += s) ticks.push(v);
  return ticks;
}

export default function LineChart({ data, height = 220, formatValue, baseline }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  if (data.length === 0) {
    return (
      <p className="flex items-center justify-center py-12 text-sm text-zinc-400">
        No closed plays in this window.
      </p>
    );
  }

  const H = height;
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

  const path = data
    .map((d, i) => `${i === 0 ? "M" : "L"}${x(d.ts).toFixed(1)},${y(d.value).toFixed(1)}`)
    .join("");

  const ticks = niceTicks(yMin, yMax);
  const dateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
  const xTickIdx = data.length <= 4 ? data.map((_, i) => i) : [0, Math.floor((data.length - 1) / 2), data.length - 1];

  function onMove(e: React.MouseEvent) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const fx = ((e.clientX - rect.left) / rect.width) * W;
    let best = 0;
    let bestDist = Infinity;
    data.forEach((d, i) => {
      const dist = Math.abs(x(d.ts) - fx);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    });
    setHover(best);
  }

  const h = hover !== null ? data[hover] : null;

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
        role="img"
        aria-label="Line chart"
      >
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
            <text
              x={PAD.left - 8}
              y={y(t) + 3.5}
              textAnchor="end"
              className="fill-zinc-400 text-[11px]"
            >
              {formatValue(t)}
            </text>
          </g>
        ))}
        {baseline !== undefined && baseline >= yMin && baseline <= yMax && (
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
            x={x(data[i].ts)}
            y={H - 6}
            textAnchor="middle"
            className="fill-zinc-400 text-[11px]"
          >
            {dateFmt.format(new Date(data[i].ts * 1000))}
          </text>
        ))}
        <path
          d={path}
          fill="none"
          strokeWidth={2}
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
              r={4.5}
              className="fill-emerald-600 stroke-white dark:fill-emerald-400 dark:stroke-zinc-900"
              strokeWidth={2}
            />
          </>
        )}
      </svg>
      {h && (
        <div
          className="pointer-events-none absolute top-1 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs shadow-md dark:border-zinc-700 dark:bg-zinc-800"
          style={{ left: `${(x(h.ts) / W) * 100}%` }}
        >
          <span className="text-zinc-400">
            {dateFmt.format(new Date(h.ts * 1000))}
          </span>{" "}
          <span className="font-medium tabular-nums">{formatValue(h.value)}</span>
        </div>
      )}
    </div>
  );
}

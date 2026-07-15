"use client";

import { useState } from "react";
import type { TrendPoint } from "@/lib/analytics";
import { useContainerWidth } from "./useContainerWidth";
import { smoothPath } from "./smoothPath";

const PAD = { top: 10, right: 10, bottom: 22, left: 58 };
const H = 240;
const TICK_CLASS = "fill-zinc-400 text-[11px]";

const CASH_STROKE = "stroke-sky-500 dark:stroke-sky-400";
const CASH_FILL = "fill-sky-500/60 dark:fill-sky-400/50";
const CASH_DOT = "bg-sky-500 dark:bg-sky-400";
const VALUE_STROKE = "stroke-violet-500 dark:stroke-violet-400";
const VALUE_FILL = "fill-violet-500/60 dark:fill-violet-400/50";
const VALUE_DOT = "bg-violet-500 dark:bg-violet-400";

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

/** Cash and Portfolio Value are stacked (Value sits on top of Cash), so the
 * combined top edge reads as the total without drawing a third series. */
export default function NetWorthChart({
  cash,
  value,
  formatValue,
}: {
  cash: TrendPoint[];
  value: TrendPoint[];
  formatValue: (v: number) => string;
}) {
  const [containerRef, measuredWidth] = useContainerWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const n = Math.min(cash.length, value.length);
  if (n === 0) {
    return (
      <p className="flex items-center justify-center py-12 text-sm text-zinc-400">
        Not enough history to chart yet.
      </p>
    );
  }

  const points = Array.from({ length: n }, (_, i) => ({
    ts: cash[i].ts,
    cash: cash[i].value,
    value: value[i].value,
    total: cash[i].value + value[i].value,
  }));

  const W = measuredWidth || 560;
  const xs = points.map((p) => p.ts);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  let yMin = Math.min(0, ...points.map((p) => Math.min(p.cash, 0)));
  let yMax = Math.max(...points.map((p) => p.total));
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
  const dateFmt = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const xTickIdx =
    points.length <= 4
      ? points.map((_, i) => i)
      : [0, Math.floor((points.length - 1) / 2), points.length - 1];

  const cashPts = points.map((p) => ({ x: x(p.ts), y: y(p.cash) }));
  const totalPts = points.map((p) => ({ x: x(p.ts), y: y(p.total) }));
  const zeroY = y(0);

  const cashPath = smoothPath(cashPts);
  const cashArea = `${cashPath}L${cashPts[cashPts.length - 1].x.toFixed(1)},${zeroY}L${cashPts[0].x.toFixed(1)},${zeroY}Z`;

  const totalPath = smoothPath(totalPts);
  // Stack Value on top of Cash: fill the band between the cash line and the
  // combined (cash+value) line by tracing the total path forward, then the
  // cash path backward.
  const valueArea = `${totalPath}L${cashPts[cashPts.length - 1].x.toFixed(1)},${cashPts[cashPts.length - 1].y.toFixed(1)}${[...cashPts]
    .reverse()
    .slice(1)
    .map((p) => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join("")}Z`;

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const fx = e.clientX - rect.left;
    let best = 0;
    let bestDist = Infinity;
    points.forEach((p, i) => {
      const dist = Math.abs(x(p.ts) - fx);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    });
    setHover(best);
  }

  const h = hover !== null ? points[hover] : null;

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
          aria-label="Cash and portfolio value, stacked, over time"
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
              <text x={PAD.left - 8} y={y(t) + 3.5} textAnchor="end" className={TICK_CLASS}>
                {formatValue(t)}
              </text>
            </g>
          ))}
          {xTickIdx.map((i) => (
            <text
              key={i}
              x={Math.min(Math.max(x(points[i].ts), PAD.left + 30), W - PAD.right - 30)}
              y={H - 6}
              textAnchor="middle"
              className={TICK_CLASS}
            >
              {dateFmt.format(new Date(points[i].ts * 1000))}
            </text>
          ))}

          <path d={valueArea} className={VALUE_FILL} />
          <path d={cashArea} className={CASH_FILL} />
          <path
            d={cashPath}
            fill="none"
            strokeWidth={1.5}
            strokeLinejoin="round"
            strokeLinecap="round"
            className={CASH_STROKE}
          />
          <path
            d={totalPath}
            fill="none"
            strokeWidth={1.5}
            strokeLinejoin="round"
            strokeLinecap="round"
            className={VALUE_STROKE}
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
              <circle cx={x(h.ts)} cy={y(h.cash)} r={3.5} className={`${CASH_DOT} stroke-white dark:stroke-zinc-900`} strokeWidth={2} />
              <circle cx={x(h.ts)} cy={y(h.total)} r={3.5} className={`${VALUE_DOT} stroke-white dark:stroke-zinc-900`} strokeWidth={2} />
            </>
          )}
        </svg>
      )}
      {h && (
        <div
          className="pointer-events-none absolute top-1 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs shadow-md dark:border-zinc-700 dark:bg-zinc-800"
          style={{ left: Math.min(Math.max(x(h.ts), 90), W - 90) }}
        >
          <p className="mb-1 font-medium text-zinc-500 dark:text-zinc-400">
            {dateFmt.format(new Date(h.ts * 1000))}
          </p>
          <p className="flex items-center gap-1.5">
            <span className={`h-2 w-2 shrink-0 rounded-full ${CASH_DOT}`} />
            <span className="text-zinc-500 dark:text-zinc-400">Cash</span>
            <span className="ml-auto font-medium tabular-nums">{formatValue(h.cash)}</span>
          </p>
          <p className="flex items-center gap-1.5">
            <span className={`h-2 w-2 shrink-0 rounded-full ${VALUE_DOT}`} />
            <span className="text-zinc-500 dark:text-zinc-400">Portfolio Value</span>
            <span className="ml-auto font-medium tabular-nums">{formatValue(h.value)}</span>
          </p>
          <p className="mt-1 flex items-center gap-1.5 border-t border-zinc-100 pt-1 dark:border-zinc-700">
            <span className="text-zinc-500 dark:text-zinc-400">Total</span>
            <span className="ml-auto font-semibold tabular-nums">{formatValue(h.total)}</span>
          </p>
        </div>
      )}
      <div className="mt-3 flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
        <span className="flex items-center gap-1.5">
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${CASH_DOT}`} />
          Cash
        </span>
        <span className="flex items-center gap-1.5">
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${VALUE_DOT}`} />
          Portfolio Value
        </span>
      </div>
    </div>
  );
}

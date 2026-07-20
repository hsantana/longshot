"use client";

import { useState } from "react";
import type { Slice } from "@/lib/portfolio";

/** Two-tone donut for a part-to-whole split. Values must be non-negative. */
const COLORS = [
  { arc: "stroke-sky-500 dark:stroke-sky-400", dot: "bg-sky-500 dark:bg-sky-400" },
  { arc: "stroke-violet-500 dark:stroke-violet-400", dot: "bg-violet-500 dark:bg-violet-400" },
  { arc: "stroke-emerald-500 dark:stroke-emerald-400", dot: "bg-emerald-500 dark:bg-emerald-400" },
  { arc: "stroke-amber-500 dark:stroke-amber-400", dot: "bg-amber-500 dark:bg-amber-400" },
];

const SIZE = 148;
const STROKE = 22;
const R = (SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;

export default function DonutChart({
  slices,
  formatValue,
}: {
  slices: Slice[];
  formatValue: (v: number) => string;
}) {
  const [hover, setHover] = useState<number | null>(null);

  const positive = slices.filter((s) => s.value > 0);
  const total = positive.reduce((s, x) => s + x.value, 0);

  if (total <= 0) {
    return (
      <p className="flex items-center justify-center py-12 text-sm text-zinc-400">
        Nothing to show.
      </p>
    );
  }

  let offset = 0;
  const arcs = positive.map((s, i) => {
    const frac = s.value / total;
    const arc = { slice: s, frac, dash: frac * C, offset, color: COLORS[i % COLORS.length] };
    offset += frac * C;
    return arc;
  });

  const active = hover !== null ? arcs[hover] : null;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} className="-rotate-90" role="img" aria-label="Composition">
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            strokeWidth={STROKE}
            className="stroke-zinc-100 dark:stroke-zinc-800"
          />
          {arcs.map((a, i) => (
            <circle
              key={a.slice.key}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={R}
              fill="none"
              strokeWidth={hover === i ? STROKE + 3 : STROKE}
              strokeDasharray={`${a.dash} ${C - a.dash}`}
              strokeDashoffset={-a.offset}
              className={`${a.color.arc} transition-[stroke-width]`}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            />
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[11px] uppercase tracking-wide text-zinc-400">
            {active ? active.slice.label : "Total"}
          </span>
          <span className="text-sm font-semibold tabular-nums">
            {formatValue(active ? active.slice.value : total)}
          </span>
          {active && (
            <span className="text-[11px] tabular-nums text-zinc-400">
              {(active.frac * 100).toFixed(1)}%
            </span>
          )}
        </div>
      </div>

      <ul className="w-full space-y-2">
        {arcs.map((a, i) => (
          <li
            key={a.slice.key}
            className="flex items-center gap-2 text-sm"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          >
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${a.color.dot}`} />
            <span className="min-w-0 flex-1 truncate text-zinc-600 dark:text-zinc-300">
              {a.slice.label}
            </span>
            <span className="shrink-0 font-medium tabular-nums">
              {formatValue(a.slice.value)}
            </span>
            <span className="w-10 shrink-0 text-right text-xs tabular-nums text-zinc-400">
              {(a.frac * 100).toFixed(0)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

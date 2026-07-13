"use client";

import type { StylePoint } from "@/lib/analytics";
import { useContainerWidth } from "./useContainerWidth";

const H = 230;
const PAD = { top: 10, right: 10, bottom: 30, left: 26 };

export default function Quadrant({ point }: { point: StylePoint | null }) {
  const [containerRef, measuredWidth] = useContainerWidth<HTMLDivElement>();

  if (!point) {
    return (
      <p className="flex items-center justify-center py-16 text-sm text-zinc-400">
        No closed plays in this window.
      </p>
    );
  }

  const W = measuredWidth || 560;
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  // X: avg entry probability, 0 (risky) .. 1 (conservative).
  const px = PAD.left + point.avgEntry * plotW;
  // Y: plays/week on a sqrt scale (touch differences matter most near zero).
  const yMax = Math.max(10, point.playsPerWeek * 1.3);
  const frac = Math.sqrt(point.playsPerWeek / yMax);
  const py = PAD.top + (1 - frac) * plotH;
  const midY = PAD.top + (1 - Math.sqrt(0.5)) * plotH;

  const corner = "fill-zinc-300 dark:fill-zinc-600 text-[10px] font-medium uppercase tracking-wide";
  const axis = "fill-zinc-400 text-[11px]";

  const label = `${(point.avgEntry * 100).toFixed(0)}% avg entry · ${point.playsPerWeek.toFixed(1)} plays/wk`;
  const labelX = Math.min(Math.max(px, PAD.left + 100), W - PAD.right - 100);
  const labelY = py - 12 < PAD.top + 24 ? py + 22 : py - 12;

  return (
    <div ref={containerRef}>
      {measuredWidth > 0 && (
        <svg width={W} height={H} className="block" role="img" aria-label="Trading style quadrant">
          <rect
            x={PAD.left}
            y={PAD.top}
            width={plotW}
            height={plotH}
            rx={8}
            className="fill-zinc-50 stroke-zinc-200 dark:fill-zinc-800/40 dark:stroke-zinc-800"
          />
          <line
            x1={PAD.left + plotW / 2}
            x2={PAD.left + plotW / 2}
            y1={PAD.top}
            y2={PAD.top + plotH}
            className="stroke-zinc-200 dark:stroke-zinc-800"
            strokeDasharray="4 4"
          />
          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={midY}
            y2={midY}
            className="stroke-zinc-200 dark:stroke-zinc-800"
            strokeDasharray="4 4"
          />

          <text x={PAD.left + 8} y={PAD.top + 15} className={corner}>
            Risky · High-touch
          </text>
          <text x={W - PAD.right - 8} y={PAD.top + 15} textAnchor="end" className={corner}>
            Conservative · High-touch
          </text>
          <text x={PAD.left + 8} y={PAD.top + plotH - 7} className={corner}>
            Risky · Low-touch
          </text>
          <text x={W - PAD.right - 8} y={PAD.top + plotH - 7} textAnchor="end" className={corner}>
            Conservative · Low-touch
          </text>

          <text x={PAD.left} y={H - 8} className={axis}>
            ← risky (low avg. entry prob.)
          </text>
          <text x={W - PAD.right} y={H - 8} textAnchor="end" className={axis}>
            conservative (high) →
          </text>
          <text
            x={10}
            y={PAD.top + plotH}
            transform={`rotate(-90 10 ${PAD.top + plotH})`}
            className={axis}
          >
            low-touch →
          </text>

          <circle cx={px} cy={py} r={8} className="fill-emerald-500/25" />
          <circle
            cx={px}
            cy={py}
            r={5}
            className="fill-emerald-600 stroke-white dark:fill-emerald-400 dark:stroke-zinc-900"
            strokeWidth={2}
          />
          <text
            x={labelX}
            y={labelY}
            textAnchor="middle"
            className="fill-zinc-600 text-[11px] font-medium dark:fill-zinc-300"
          >
            {label}
          </text>
        </svg>
      )}
    </div>
  );
}

"use client";

import type { StylePoint } from "@/lib/analytics";

const W = 560;
const H = 360;
const PAD = 44;

export default function Quadrant({ point }: { point: StylePoint | null }) {
  if (!point) {
    return (
      <p className="flex items-center justify-center py-16 text-sm text-zinc-400">
        No closed plays in this window.
      </p>
    );
  }

  // X: avg entry probability, 0 (risky) .. 1 (conservative).
  const px = PAD + point.avgEntry * (W - 2 * PAD);
  // Y: plays/week on a sqrt scale (touch differences matter most near zero).
  const yMax = Math.max(10, point.playsPerWeek * 1.3);
  const frac = Math.sqrt(point.playsPerWeek / yMax);
  const py = H - PAD - frac * (H - 2 * PAD);
  const midY = H - PAD - Math.sqrt(0.5) * (H - 2 * PAD);

  const corner = "fill-zinc-300 dark:fill-zinc-600 text-[11px] font-medium uppercase tracking-wide";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Trading style quadrant">
      <rect
        x={PAD}
        y={PAD}
        width={W - 2 * PAD}
        height={H - 2 * PAD}
        rx={8}
        className="fill-zinc-50 stroke-zinc-200 dark:fill-zinc-800/40 dark:stroke-zinc-800"
      />
      <line x1={W / 2} x2={W / 2} y1={PAD} y2={H - PAD} className="stroke-zinc-200 dark:stroke-zinc-800" strokeDasharray="4 4" />
      <line x1={PAD} x2={W - PAD} y1={midY} y2={midY} className="stroke-zinc-200 dark:stroke-zinc-800" strokeDasharray="4 4" />

      <text x={PAD + 10} y={PAD + 20} className={corner}>Risky · High-touch</text>
      <text x={W - PAD - 10} y={PAD + 20} textAnchor="end" className={corner}>Conservative · High-touch</text>
      <text x={PAD + 10} y={H - PAD - 10} className={corner}>Risky · Low-touch</text>
      <text x={W - PAD - 10} y={H - PAD - 10} textAnchor="end" className={corner}>Conservative · Low-touch</text>

      <text x={PAD} y={H - 12} className="fill-zinc-400 text-[11px]">← risky (low avg. entry prob.)</text>
      <text x={W - PAD} y={H - 12} textAnchor="end" className="fill-zinc-400 text-[11px]">conservative (high) →</text>
      <text x={14} y={H - PAD} transform={`rotate(-90 14 ${H - PAD})`} className="fill-zinc-400 text-[11px]">low-touch →</text>

      <circle cx={px} cy={py} r={9} className="fill-emerald-500/25" />
      <circle
        cx={px}
        cy={py}
        r={5.5}
        className="fill-emerald-600 stroke-white dark:fill-emerald-400 dark:stroke-zinc-900"
        strokeWidth={2}
      />
      <text
        x={Math.min(Math.max(px, PAD + 120), W - PAD - 120)}
        y={py - 14 < PAD + 34 ? py + 26 : py - 14}
        textAnchor="middle"
        className="fill-zinc-600 text-[12px] font-medium dark:fill-zinc-300"
      >
        {(point.avgEntry * 100).toFixed(0)}% avg entry · {point.playsPerWeek.toFixed(1)} plays/wk
      </text>
    </svg>
  );
}

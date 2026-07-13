"use client";

import { useState } from "react";
import type { DayCell } from "@/lib/analytics";
import { formatSignedUsd } from "@/lib/format";
import { useContainerWidth } from "./useContainerWidth";

interface Props {
  days: Map<string, DayCell>;
  /** Window start (unix seconds); the grid runs from here to today. */
  startSec: number;
  nowSec: number;
}

const GAP = 4;
const HEADER_H = 18; // room for month labels
const GRID_H = 160; // fixed square-area height — the card never changes height
const LABEL_W = 24; // weekday labels (GitHub mode only)
const MAX_WEEKS = 53;
// Ranges up to this many days reflow chronologically to fill the width; longer
// ranges use the GitHub-style weekday-column layout.
const WRAP_MAX_DAYS = 45;
const MAX_ROWS = 6;

// Color priority per spec: resolved PnL (diverging, 3 shades/arm by tercile)
// beats opened-only gray; no activity = near-blank.
const POS = [
  "fill-emerald-200 dark:fill-emerald-900",
  "fill-emerald-400 dark:fill-emerald-600",
  "fill-emerald-600 dark:fill-emerald-400",
];
const NEG = [
  "fill-rose-200 dark:fill-rose-900",
  "fill-rose-400 dark:fill-rose-600",
  "fill-rose-600 dark:fill-rose-400",
];
const OPENED = "fill-zinc-300 dark:fill-zinc-600";
const EMPTY = "fill-zinc-100 dark:fill-zinc-800/70";

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

interface HoverState {
  cell: DayCell | null;
  date: string;
  /** Viewport coordinates (tooltip is position:fixed so it can't be clipped). */
  clientX: number;
  clientY: number;
}

interface Square {
  key: string;
  date: Date;
  x: number;
  y: number;
}

export default function CalendarHeatmap({ days, startSec, nowSec }: Props) {
  const [containerRef, measuredWidth] = useContainerWidth<HTMLDivElement>();
  const [hover, setHover] = useState<HoverState | null>(null);

  const dayMs = 86400 * 1000;
  const end = new Date(nowSec * 1000);
  end.setUTCHours(0, 0, 0, 0);
  const windowStart = new Date(startSec * 1000);
  windowStart.setUTCHours(0, 0, 0, 0);

  const spanDays = Math.round((end.getTime() - windowStart.getTime()) / dayMs) + 1;
  const wrap = spanDays <= WRAP_MAX_DAYS;

  const cardW = measuredWidth || 560;
  const svgHeight = HEADER_H + GRID_H;

  const monthFmt = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" });
  const dateFmt = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

  // ---- Build square positions + month labels for the active mode ----
  const squares: Square[] = [];
  const monthLabels: { text: string; x: number }[] = [];
  const weekdayLabels: { text: string; y: number }[] = [];
  let cell = 16;
  let svgWidth = cardW;
  let gridStart = windowStart;

  if (wrap) {
    // Chronological reflow: choose the row count that yields the biggest square
    // that both fills the width and fits the fixed height.
    const n = Math.max(spanDays, 1);
    let best = { rows: 1, cell: 0, cols: n };
    for (let rows = 1; rows <= MAX_ROWS; rows++) {
      const cols = Math.ceil(n / rows);
      const byW = Math.floor(cardW / cols) - GAP;
      const byH = Math.floor(GRID_H / rows) - GAP;
      const c = Math.min(byW, byH);
      if (c > best.cell) best = { rows, cell: c, cols };
    }
    cell = Math.max(best.cell, 6);
    const { rows, cols } = best;
    const slot = cell + GAP;
    const blockW = cols * slot - GAP;
    const blockH = rows * slot - GAP;
    const offsetX = Math.max((cardW - blockW) / 2, 0);
    const offsetY = HEADER_H + Math.max((GRID_H - blockH) / 2, 0);

    for (let i = 0; i < n; i++) {
      const date = new Date(windowStart.getTime() + i * dayMs);
      const row = Math.floor(i / cols);
      const col = i % cols;
      const x = offsetX + col * slot;
      const y = offsetY + row * slot;
      squares.push({ key: isoDay(date), date, x, y });
      if (i === 0 || date.getUTCDate() === 1) {
        monthLabels.push({ text: monthFmt.format(date), x });
      }
    }
    svgWidth = cardW;
  } else {
    // GitHub-style: 7 weekday rows, columns are weeks. Cell size is the smaller
    // of what the fixed height allows and what fits all week-columns across the
    // card width, so the whole range fits with no horizontal scroll.
    const start = new Date(
      Math.max(windowStart.getTime(), end.getTime() - MAX_WEEKS * 7 * dayMs)
    );
    start.setUTCDate(start.getUTCDate() - start.getUTCDay()); // align to Sunday
    gridStart = start;

    const totalDays = Math.round((end.getTime() - start.getTime()) / dayMs) + 1;
    const weeks = Math.ceil(totalDays / 7);
    const byHeight = Math.floor((GRID_H - 6 * GAP) / 7);
    const byWidth = Math.floor((cardW - LABEL_W) / weeks) - GAP;
    cell = Math.max(Math.min(byHeight, byWidth), 4);
    const slot = cell + GAP;
    // Center the 7-row block vertically within the fixed grid height.
    const blockH = 7 * slot - GAP;
    const gridTop = HEADER_H + Math.max((GRID_H - blockH) / 2, 0);

    let lastMonth = -1;
    const cursor = new Date(start);
    let weekIndex = 0;
    while (cursor <= end) {
      const month = cursor.getUTCMonth();
      if (month !== lastMonth) {
        lastMonth = month;
        monthLabels.push({ text: monthFmt.format(cursor), x: LABEL_W + weekIndex * slot });
      }
      for (let d = 0; d < 7 && cursor <= end; d++) {
        const date = new Date(cursor);
        squares.push({
          key: isoDay(date),
          date,
          x: LABEL_W + weekIndex * slot,
          y: gridTop + date.getUTCDay() * slot,
        });
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
      weekIndex++;
    }

    ["Mon", "Wed", "Fri"].forEach((label, i) => {
      weekdayLabels.push({ text: label[0], y: gridTop + (1 + i * 2) * slot + cell - 3 });
    });
    svgWidth = LABEL_W + weekIndex * slot;
  }

  // Terciles of |net| among resolved days within the visible window.
  const startKey = isoDay(gridStart);
  const magnitudes = [...days.values()]
    .filter((d) => (d.wins > 0 || d.losses > 0) && d.date >= startKey)
    .map((d) => Math.abs(d.net))
    .sort((a, b) => a - b);
  const t1 = magnitudes[Math.floor(magnitudes.length / 3)] ?? 0;
  const t2 = magnitudes[Math.floor((2 * magnitudes.length) / 3)] ?? 0;
  const shade = (net: number) => {
    const m = Math.abs(net);
    const i = m >= t2 ? 2 : m >= t1 ? 1 : 0;
    return net >= 0 ? POS[i] : NEG[i];
  };

  const radius = Math.min(4, cell / 4);

  return (
    <div ref={containerRef} className="relative">
      {measuredWidth > 0 && (
        <div className="overflow-x-auto">
          <svg width={svgWidth} height={svgHeight} className="mx-auto block">
            {weekdayLabels.map((l) => (
              <text key={l.text} x={0} y={l.y} className="fill-zinc-400 text-[10px]">
                {l.text}
              </text>
            ))}
            {monthLabels.map((l, i) => (
              <text key={i} x={l.x} y={10} className="fill-zinc-400 text-[10px]">
                {l.text}
              </text>
            ))}
            {squares.map((sq) => {
              const c = days.get(sq.key);
              const resolved = c && (c.wins > 0 || c.losses > 0);
              const cls = resolved
                ? shade(c.net)
                : c && c.opened > 0
                  ? OPENED
                  : EMPTY;
              return (
                <rect
                  key={sq.key}
                  x={sq.x}
                  y={sq.y}
                  width={cell}
                  height={cell}
                  rx={radius}
                  className={cls}
                  onMouseEnter={(e) =>
                    setHover({
                      cell: c ?? null,
                      date: dateFmt.format(sq.date),
                      clientX: e.clientX,
                      clientY: e.clientY,
                    })
                  }
                  onMouseLeave={() => setHover(null)}
                />
              );
            })}
          </svg>
        </div>
      )}
      {hover && (
        <div
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs shadow-md dark:border-zinc-700 dark:bg-zinc-800"
          style={{ left: hover.clientX, top: hover.clientY - 10 }}
        >
          <p className="font-medium">{hover.date}</p>
          {hover.cell ? (
            <p className="text-zinc-500 dark:text-zinc-400">
              {hover.cell.wins > 0 && (
                <>
                  {hover.cell.wins} win{hover.cell.wins > 1 ? "s" : ""} (
                  {formatSignedUsd(hover.cell.winsPnl)}){", "}
                </>
              )}
              {hover.cell.losses > 0 && (
                <>
                  {hover.cell.losses} loss{hover.cell.losses > 1 ? "es" : ""} (
                  {formatSignedUsd(hover.cell.lossesPnl)}){", "}
                </>
              )}
              {(hover.cell.wins > 0 || hover.cell.losses > 0) && (
                <>net {formatSignedUsd(hover.cell.net)}{"; "}</>
              )}
              {hover.cell.opened > 0
                ? `${hover.cell.opened} buy${hover.cell.opened > 1 ? "s" : ""}`
                : "nothing opened"}
            </p>
          ) : (
            <p className="text-zinc-500 dark:text-zinc-400">No activity</p>
          )}
        </div>
      )}
      <div className="mt-3 flex items-center gap-3 text-[11px] text-zinc-400">
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded-[3px] bg-zinc-300 dark:bg-zinc-600" /> opened only
        </span>
        <span className="flex items-center gap-1">
          loss
          <span className="h-3 w-3 rounded-[3px] bg-rose-600 dark:bg-rose-400" />
          <span className="h-3 w-3 rounded-[3px] bg-rose-400 dark:bg-rose-600" />
          <span className="h-3 w-3 rounded-[3px] bg-rose-200 dark:bg-rose-900" />
          <span className="h-3 w-3 rounded-[3px] bg-zinc-100 dark:bg-zinc-800" />
          <span className="h-3 w-3 rounded-[3px] bg-emerald-200 dark:bg-emerald-900" />
          <span className="h-3 w-3 rounded-[3px] bg-emerald-400 dark:bg-emerald-600" />
          <span className="h-3 w-3 rounded-[3px] bg-emerald-600 dark:bg-emerald-400" />
          win
        </span>
      </div>
    </div>
  );
}

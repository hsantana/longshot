"use client";

import { useState } from "react";
import type { DayCell } from "@/lib/analytics";
import { formatSignedUsd } from "@/lib/format";
import { useContainerWidth } from "./useContainerWidth";

interface Props {
  days: Map<string, DayCell>;
  /** Window start (unix seconds); the grid runs from here to today, capped at 53 weeks. */
  startSec: number;
  nowSec: number;
}

const GAP = 3;
const MAX_WEEKS = 53;
const LABEL_W = 28;

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

export default function CalendarHeatmap({ days, startSec, nowSec }: Props) {
  const [containerRef, measuredWidth] = useContainerWidth<HTMLDivElement>();
  const [hover, setHover] = useState<HoverState | null>(null);

  const end = new Date(nowSec * 1000);
  end.setUTCHours(0, 0, 0, 0);
  const start = new Date(Math.max(startSec, nowSec - MAX_WEEKS * 7 * 86400) * 1000);
  start.setUTCHours(0, 0, 0, 0);
  // Align to Sunday so columns are calendar weeks.
  start.setUTCDate(start.getUTCDate() - start.getUTCDay());

  const columns: { date: Date; key: string }[][] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    const col: { date: Date; key: string }[] = [];
    for (let i = 0; i < 7 && cursor <= end; i++) {
      col.push({ date: new Date(cursor), key: isoDay(cursor) });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    columns.push(col);
  }

  // Cell size adapts to the window: few weeks → big cells filling the card,
  // a year → small cells, still fitting without dead space. Capped at 48px so
  // short windows don't produce an absurdly tall 7-row grid; the grid is then
  // centered so any leftover width reads as intentional margin, not dead space.
  const available = (measuredWidth || 560) - LABEL_W;
  const cell = Math.max(10, Math.min(48, Math.floor(available / columns.length) - GAP));

  const width = LABEL_W + columns.length * (cell + GAP);
  const height = 7 * (cell + GAP) + 18;
  const monthFmt = new Intl.DateTimeFormat("en-US", { month: "short" });
  const dateFmt = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

  // Terciles of |net| among days with resolutions, within the visible window.
  const startKey = isoDay(start);
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

  let lastMonth = -1;

  return (
    <div ref={containerRef} className="relative">
      {measuredWidth > 0 && (
        <div className="overflow-x-auto">
          <svg width={width} height={height} className="mx-auto block">
            {["Mon", "Wed", "Fri"].map((label, i) => (
              <text
                key={label}
                x={0}
                y={18 + (1 + i * 2) * (cell + GAP) + cell - 3}
                className="fill-zinc-400 text-[10px]"
              >
                {label[0]}
              </text>
            ))}
            {columns.map((col, ci) => {
              const month = col[0].date.getUTCMonth();
              const showMonth = month !== lastMonth;
              lastMonth = month;
              return (
                <g key={ci} transform={`translate(${LABEL_W + ci * (cell + GAP)},0)`}>
                  {showMonth && (
                    <text x={0} y={10} className="fill-zinc-400 text-[10px]">
                      {monthFmt.format(col[0].date)}
                    </text>
                  )}
                  {col.map((day) => {
                    const c = days.get(day.key);
                    const resolved = c && (c.wins > 0 || c.losses > 0);
                    const cls = resolved
                      ? shade(c.net)
                      : c && c.opened > 0
                        ? OPENED
                        : EMPTY;
                    return (
                      <rect
                        key={day.key}
                        x={0}
                        y={18 + day.date.getUTCDay() * (cell + GAP)}
                        width={cell}
                        height={cell}
                        rx={Math.min(4, cell / 4)}
                        className={cls}
                        onMouseEnter={(e) =>
                          setHover({
                            cell: c ?? null,
                            date: dateFmt.format(day.date),
                            clientX: e.clientX,
                            clientY: e.clientY,
                          })
                        }
                        onMouseLeave={() => setHover(null)}
                      />
                    );
                  })}
                </g>
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
      <div className="mt-2 flex items-center gap-3 text-[11px] text-zinc-400">
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

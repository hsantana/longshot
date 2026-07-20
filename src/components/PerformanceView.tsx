"use client";

import { useMemo, useState } from "react";
import {
  DEFAULT_FILTERS,
  bandBreakdown,
  bestAndWorstPlays,
  calendarDays,
  categoryBreakdown,
  cumulativePnlSeries,
  cumulativeVolumeSeries,
  filterPlays,
  filterPositionPlays,
  filterTrades,
  returnRatio,
  returnRatioTrend,
  windowStart,
  winRate,
  winRateTrend,
  type Filters,
  type Play,
  type PositionPlay,
  type TradeLite,
} from "@/lib/analytics";
import { formatSignedUsd, formatUsd, pnlColor } from "@/lib/format";
import Card from "@/components/Card";
import FilterBar from "@/components/FilterBar";
import LineChart from "@/components/charts/LineChart";
import CalendarHeatmap from "@/components/charts/CalendarHeatmap";
import BreakdownCard from "@/components/BreakdownCard";
import TopPlays from "@/components/TopPlays";
import type { TrendPoint } from "@/lib/analytics";

function InfoTip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex shrink-0">
      <span
        tabIndex={0}
        role="button"
        aria-label={text}
        className="flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-zinc-300 text-[10px] leading-none text-zinc-400 transition hover:border-zinc-400 hover:text-zinc-600 dark:border-zinc-600 dark:hover:border-zinc-500 dark:hover:text-zinc-300"
      >
        ?
      </span>
      <span className="pointer-events-none absolute left-1/2 top-6 z-20 w-52 -translate-x-1/2 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-normal normal-case tracking-normal text-zinc-600 opacity-0 shadow-md transition group-focus-within:opacity-100 group-hover:opacity-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
        {text}
      </span>
    </span>
  );
}

function TrendTile({
  label,
  hint,
  value,
  valueClass = "",
  trend,
  formatValue,
}: {
  label: string;
  hint: string;
  value: string;
  valueClass?: string;
  trend: TrendPoint[];
  formatValue: (v: number) => string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-1.5">
        <p className="whitespace-nowrap text-xs font-medium uppercase tracking-wide text-zinc-400">
          {label}
        </p>
        <InfoTip text={hint} />
      </div>
      <p
        className={`mt-1.5 whitespace-nowrap text-2xl font-semibold tabular-nums ${valueClass}`}
      >
        {value}
      </p>
      <div className="mt-2">
        <LineChart data={trend} variant="spark" height={34} area formatValue={formatValue} />
      </div>
    </div>
  );
}

export default function PerformanceView({
  plays,
  positionPlays,
  trades,
  categories,
  truncated,
  tradesTruncated,
}: {
  plays: Play[];
  positionPlays: PositionPlay[];
  trades: TradeLite[];
  categories: string[];
  truncated: boolean;
  tradesTruncated: boolean;
}) {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const nowSec = useMemo(() => Math.floor(Date.now() / 1000), []);

  const fPlays = useMemo(() => filterPlays(plays, filters, nowSec), [plays, filters, nowSec]);
  const fTrades = useMemo(() => filterTrades(trades, filters, nowSec), [trades, filters, nowSec]);

  const startSec =
    windowStart(filters.dateKey, nowSec) ||
    (fPlays.length > 0 || fTrades.length > 0
      ? Math.min(...fPlays.map((p) => p.ts), ...fTrades.map((t) => t.ts))
      : nowSec - 30 * 86400);

  const cumulative = useMemo(
    () => cumulativePnlSeries(fPlays, startSec, nowSec),
    [fPlays, startSec, nowSec]
  );
  const days = useMemo(() => calendarDays(fPlays, fTrades), [fPlays, fTrades]);
  const volumeSeries = useMemo(
    () => cumulativeVolumeSeries(fTrades, startSec, nowSec),
    [fTrades, startSec, nowSec]
  );
  const totalVolume = useMemo(
    () => fTrades.reduce((s, t) => s + t.usd, 0),
    [fTrades]
  );

  // Plays are entry-anchored and counted once per position, so bands, markets
  // and return-per-$1 read from them rather than from the dated cash events.
  const fPositionPlays = useMemo(
    () => filterPositionPlays(positionPlays, filters, nowSec),
    [positionPlays, filters, nowSec]
  );
  const bands = useMemo(
    () => bandBreakdown(fPositionPlays, fPlays, fTrades),
    [fPositionPlays, fPlays, fTrades]
  );
  // Markets is event-based (money moved in the window), so it agrees with the
  // PnL KPI — a position entered months ago but sold now still counts.
  const markets = useMemo(
    () => categoryBreakdown(fPositionPlays, fPlays, fTrades),
    [fPositionPlays, fPlays, fTrades]
  );
  const { best, worst } = useMemo(
    () => bestAndWorstPlays(positionPlays, filters, nowSec),
    [positionPlays, filters, nowSec]
  );

  // Win rate is per exit (each sale/resolution), so it stays on the dated rows.
  const wr = winRate(fPlays);
  const wrTrend = useMemo(() => winRateTrend(fPlays), [fPlays]);
  const rr = returnRatio(fPositionPlays);
  const rrTrend = useMemo(() => returnRatioTrend(fPositionPlays), [fPositionPlays]);

  const totalPnl = fPlays.reduce((s, p) => s + p.pnl, 0);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_230px] lg:items-start">
      <div className="order-2 space-y-4 lg:order-1">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <TrendTile
            label="PnL"
            hint={
              filters.status === "open"
                ? "Unrealized mark-to-market on open positions."
                : filters.status === "closed"
                  ? "Realized on plays closed in this window."
                  : "Realized in this window plus unrealized on open positions."
            }
            value={formatSignedUsd(totalPnl, true)}
            valueClass={pnlColor(totalPnl)}
            trend={cumulative}
            formatValue={(v) => formatUsd(v, true)}
          />
          <TrendTile
            label="Win rate"
            hint="Share of exits that were profitable. Counted per exit — each sale and each resolution — not per play."
            value={wr === null ? "—" : `${(wr * 100).toFixed(1)}%`}
            trend={wrTrend}
            formatValue={(v) => `${v.toFixed(0)}%`}
          />
          <TrendTile
            label="Return per $1"
            hint="Dollars back per dollar staked, across whole positions, including the current value of anything still held."
            value={rr === null ? "—" : `$${rr.toFixed(2)}`}
            valueClass={rr !== null && rr < 1 ? "text-rose-500" : ""}
            trend={rrTrend}
            formatValue={(v) => `$${v.toFixed(2)}`}
          />
          <TrendTile
            label="Volume"
            hint="Total traded in this window — buys and sells added together."
            value={formatUsd(totalVolume, true)}
            trend={volumeSeries}
            formatValue={(v) => formatUsd(v, true)}
          />
        </div>

        <Card
          title="Cumulative PnL"
          subtitle={`${fPlays.length} play${fPlays.length === 1 ? "" : "s"} · net ${formatSignedUsd(totalPnl)}`}
        >
          <LineChart
            data={cumulative}
            formatValue={(v) => formatUsd(v, true)}
            baseline={0}
            area
          />
        </Card>

        <Card
          title="Calendar"
          subtitle="Days colored by net PnL of plays resolved that day; gray = opened only"
        >
          <CalendarHeatmap days={days} startSec={startSec} nowSec={nowSec} />
        </Card>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <BreakdownCard
            title="Plays by probability band"
            subtitle="Probability at entry"
            labelHeader="Band"
            rows={bands}
          />

          <BreakdownCard
            title="Markets"
            subtitle="By category"
            labelHeader="Category"
            rows={markets}
          />
        </div>

        <TopPlays best={best} worst={worst} />

        {tradesTruncated ? (
          <p className="text-xs text-amber-600 dark:text-amber-500">
            Trade limit reached — showing the most recent 3,000 trades. Older
            history is not included, so entry dates and totals may be incomplete.
          </p>
        ) : (
          truncated && (
            <p className="text-xs text-zinc-400">
              Note: this account exceeds the fetch cap (500 closed positions);
              older history is not included.
            </p>
          )
        )}
      </div>

      <aside className="order-1 lg:order-2 lg:sticky lg:top-8 lg:self-start">
        <FilterBar categories={categories} filters={filters} onChange={setFilters} />
      </aside>
    </div>
  );
}

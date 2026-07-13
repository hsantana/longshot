"use client";

import { useMemo, useState } from "react";
import {
  DEFAULT_FILTERS,
  bandDistribution,
  calendarDays,
  categoryBreakdown,
  cumulativePnlSeries,
  filterPlays,
  filterTrades,
  returnRatio,
  returnRatioTrend,
  windowStart,
  winRate,
  winRateTrend,
  type Filters,
  type Play,
  type TradeLite,
} from "@/lib/analytics";
import { formatSignedUsd, formatUsd, pnlColor } from "@/lib/format";
import Card from "@/components/Card";
import FilterBar from "@/components/FilterBar";
import LineChart from "@/components/charts/LineChart";
import CalendarHeatmap from "@/components/charts/CalendarHeatmap";
import BarList from "@/components/charts/BarList";
import type { TrendPoint } from "@/lib/analytics";

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
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="whitespace-nowrap text-xs font-medium uppercase tracking-wide text-zinc-400">
            {label}
          </p>
          <p
            className={`mt-1.5 whitespace-nowrap text-2xl font-semibold tabular-nums ${valueClass}`}
          >
            {value}
          </p>
          <p className="mt-0.5 text-xs text-zinc-400">{hint}</p>
        </div>
        <div className="w-20 shrink-0">
          <LineChart
            data={trend}
            variant="spark"
            height={32}
            area
            formatValue={formatValue}
          />
        </div>
      </div>
    </div>
  );
}

export default function PerformanceView({
  plays,
  trades,
  categories,
  truncated,
}: {
  plays: Play[];
  trades: TradeLite[];
  categories: string[];
  truncated: boolean;
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
  const bands = useMemo(() => bandDistribution(fPlays), [fPlays]);
  const markets = useMemo(() => categoryBreakdown(fPlays, fTrades), [fPlays, fTrades]);

  const wr = winRate(fPlays);
  const wrTrend = useMemo(() => winRateTrend(fPlays), [fPlays]);
  const rr = returnRatio(fPlays);
  const rrTrend = useMemo(() => returnRatioTrend(fPlays), [fPlays]);

  const totalPnl = fPlays.reduce((s, p) => s + p.pnl, 0);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_230px] lg:items-start">
      <div className="order-2 space-y-4 lg:order-1">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <TrendTile
            label="PnL"
            hint={
              filters.status === "open"
                ? "Unrealized, open positions"
                : filters.status === "closed"
                  ? "Realized, closed plays"
                  : "Realized + unrealized"
            }
            value={formatSignedUsd(totalPnl, true)}
            valueClass={pnlColor(totalPnl)}
            trend={cumulative}
            formatValue={(v) => formatUsd(v, true)}
          />
          <TrendTile
            label="Win rate"
            hint="Resolved wins ÷ resolved plays"
            value={wr === null ? "—" : `${(wr * 100).toFixed(1)}%`}
            trend={wrTrend}
            formatValue={(v) => `${v.toFixed(0)}%`}
          />
          <TrendTile
            label="Return per $1"
            hint="Total returned ÷ total staked"
            value={rr === null ? "—" : `$${rr.toFixed(2)}`}
            valueClass={rr !== null && rr < 1 ? "text-rose-500" : ""}
            trend={rrTrend}
            formatValue={(v) => `$${v.toFixed(2)}`}
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
          <Card title="Plays by probability band" subtitle="Probability at entry">
            <BarList
              items={bands.map((b) => ({
                label: b.label,
                sublabel: b.range,
                value: b.count,
                display: String(b.count),
                extra: b.count > 0 ? formatSignedUsd(b.pnl, true) : "",
              }))}
            />
          </Card>

          <Card title="Markets" subtitle="PnL and traded volume by category">
            <BarList
              mode="diverging"
              columns={{ value: "PnL", extra: "Volume" }}
              items={markets.map((c) => ({
                label: c.label,
                value: c.pnl,
                display: formatSignedUsd(c.pnl, true),
                extra: formatUsd(c.volume, true),
              }))}
            />
          </Card>
        </div>

        {truncated && (
          <p className="text-xs text-zinc-400">
            Note: this account exceeds the fetch cap (500 closed positions / 3,000
            trades); older history is not included.
          </p>
        )}
      </div>

      <aside className="order-1 lg:order-2 lg:sticky lg:top-8 lg:self-start">
        <FilterBar categories={categories} filters={filters} onChange={setFilters} />
      </aside>
    </div>
  );
}

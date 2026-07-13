"use client";

import { useMemo, useState } from "react";
import {
  DEFAULT_FILTERS,
  bandDistribution,
  calendarDays,
  cumulativePnlSeries,
  filterPlays,
  filterTrades,
  pnlByCategory,
  returnRatio,
  returnRatioTrend,
  volumeByCategory,
  windowStart,
  winRate,
  winRateTrend,
  type Filters,
  type Play,
  type TradeLite,
} from "@/lib/analytics";
import { formatSignedUsd, formatUsd } from "@/lib/format";
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
  trend,
  formatValue,
}: {
  label: string;
  hint: string;
  value: string;
  trend: TrendPoint[];
  formatValue: (v: number) => string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            {label}
          </p>
          <p className="mt-1.5 text-2xl font-semibold tabular-nums">{value}</p>
          <p className="mt-0.5 text-xs text-zinc-400">{hint}</p>
        </div>
        <div className="w-32 shrink-0 pt-2 sm:w-40">
          <LineChart data={trend} variant="spark" area formatValue={formatValue} />
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
  const catPnl = useMemo(() => pnlByCategory(fPlays), [fPlays]);
  const catVolume = useMemo(() => volumeByCategory(fTrades), [fTrades]);

  const wr = winRate(fPlays);
  const wrTrend = useMemo(() => winRateTrend(fPlays), [fPlays]);
  const rr = returnRatio(fPlays);
  const rrTrend = useMemo(() => returnRatioTrend(fPlays), [fPlays]);

  const totalPnl = fPlays.reduce((s, p) => s + p.pnl, 0);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_230px] lg:items-start">
      <div className="order-2 space-y-4 lg:order-1">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            trend={rrTrend}
            formatValue={(v) => `$${v.toFixed(2)}`}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Card
            title="Cumulative PnL"
            subtitle={`${fPlays.length} closed play${fPlays.length === 1 ? "" : "s"} · net ${formatSignedUsd(totalPnl)}`}
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
        </div>

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

          <div className="space-y-4">
            <Card title="PnL by market category">
              <BarList
                mode="diverging"
                items={catPnl.map((c) => ({
                  label: c.label,
                  value: c.value,
                  display: formatSignedUsd(c.value, true),
                }))}
              />
            </Card>
            <Card title="Volume by market category" subtitle="Total traded (buys + sells)">
              <BarList
                items={catVolume.map((c) => ({
                  label: c.label,
                  value: c.value,
                  display: formatUsd(c.value, true),
                }))}
              />
            </Card>
          </div>
        </div>

        {truncated && (
          <p className="text-xs text-zinc-400">
            Note: this account exceeds the fetch cap (500 closed positions / 3,000
            trades); older history is not included.
          </p>
        )}
      </div>

      <aside className="order-1 lg:order-2">
        <FilterBar categories={categories} filters={filters} onChange={setFilters} />
      </aside>
    </div>
  );
}

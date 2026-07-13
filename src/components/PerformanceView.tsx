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
  volumeByCategory,
  windowStart,
  type Filters,
  type Play,
  type TradeLite,
} from "@/lib/analytics";
import { formatSignedUsd, formatUsd } from "@/lib/format";
import FilterBar from "@/components/FilterBar";
import LineChart from "@/components/charts/LineChart";
import CalendarHeatmap from "@/components/charts/CalendarHeatmap";
import BarList from "@/components/charts/BarList";

function Card({
  title,
  children,
  subtitle,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-sm font-semibold">{title}</h2>
      {subtitle && <p className="mt-0.5 text-xs text-zinc-400">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
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

  const cumulative = useMemo(() => cumulativePnlSeries(fPlays), [fPlays]);
  const days = useMemo(() => calendarDays(fPlays, fTrades), [fPlays, fTrades]);
  const bands = useMemo(() => bandDistribution(fPlays), [fPlays]);
  const catPnl = useMemo(() => pnlByCategory(fPlays), [fPlays]);
  const catVolume = useMemo(() => volumeByCategory(fTrades), [fTrades]);

  const startSec =
    windowStart(filters.dateKey, nowSec) ||
    (fPlays.length > 0 || fTrades.length > 0
      ? Math.min(
          ...fPlays.map((p) => p.ts),
          ...fTrades.map((t) => t.ts)
        )
      : nowSec - 30 * 86400);

  const totalPnl = fPlays.reduce((s, p) => s + p.pnl, 0);

  return (
    <div className="space-y-4">
      <FilterBar categories={categories} filters={filters} onChange={setFilters} />

      <Card
        title="Cumulative PnL"
        subtitle={`${fPlays.length} closed play${fPlays.length === 1 ? "" : "s"} · net ${formatSignedUsd(totalPnl)}`}
      >
        <LineChart data={cumulative} formatValue={(v) => formatUsd(v, true)} baseline={0} />
      </Card>

      <Card title="Calendar" subtitle="Days colored by net PnL of plays resolved that day; gray = opened only">
        <CalendarHeatmap days={days} startSec={startSec} nowSec={nowSec} />
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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
  );
}

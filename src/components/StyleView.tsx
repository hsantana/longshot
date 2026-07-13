"use client";

import { useMemo, useState } from "react";
import {
  DEFAULT_FILTERS,
  filterPlays,
  returnRatio,
  returnRatioTrend,
  stylePoint,
  winRate,
  winRateTrend,
  type Filters,
  type Play,
} from "@/lib/analytics";
import FilterBar from "@/components/FilterBar";
import LineChart from "@/components/charts/LineChart";
import Quadrant from "@/components/charts/Quadrant";

function Card({
  title,
  subtitle,
  children,
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

export default function StyleView({
  plays,
  categories,
}: {
  plays: Play[];
  categories: string[];
}) {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const nowSec = useMemo(() => Math.floor(Date.now() / 1000), []);

  const fPlays = useMemo(() => filterPlays(plays, filters, nowSec), [plays, filters, nowSec]);
  const point = useMemo(() => stylePoint(fPlays, filters, nowSec), [fPlays, filters, nowSec]);

  const wr = winRate(fPlays);
  const wrTrend = useMemo(() => winRateTrend(fPlays), [fPlays]);
  const rr = returnRatio(fPlays);
  const rrTrend = useMemo(() => returnRatioTrend(fPlays), [fPlays]);

  return (
    <div className="space-y-4">
      <FilterBar categories={categories} filters={filters} onChange={setFilters} />

      <Card
        title="Trading style"
        subtitle="Average probability at entry (risk appetite) vs. plays per week (touch)"
      >
        <Quadrant point={point} />
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Win rate" subtitle="Resolved wins ÷ resolved plays, weekly">
          <p className="text-3xl font-semibold tabular-nums">
            {wr === null ? "—" : `${(wr * 100).toFixed(1)}%`}
          </p>
          <div className="mt-3">
            <LineChart
              data={wrTrend}
              height={160}
              formatValue={(v) => `${v.toFixed(0)}%`}
              baseline={50}
            />
          </div>
        </Card>

        <Card title="Return per $1" subtitle="Total returned ÷ total staked, weekly">
          <p className="text-3xl font-semibold tabular-nums">
            {rr === null ? "—" : `$${rr.toFixed(2)}`}
          </p>
          <div className="mt-3">
            <LineChart
              data={rrTrend}
              height={160}
              formatValue={(v) => `$${v.toFixed(2)}`}
              baseline={1}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}

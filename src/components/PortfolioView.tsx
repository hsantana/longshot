"use client";

import { useMemo, useState } from "react";
import type { AccountSummary, ClosedPosition, OpenPosition } from "@/lib/polymarket";
import type { NetWorthHistory } from "@/lib/networth";
import { bandOf, windowStart, type BandKey, type TrendPoint } from "@/lib/analytics";
import { formatSignedUsd, formatUsd, pnlColor } from "@/lib/format";
import PositionTables from "@/components/PositionTables";
import Card from "@/components/Card";
import NetWorthChart from "@/components/charts/NetWorthChart";
import DonutChart from "@/components/charts/DonutChart";
import BarList from "@/components/charts/BarList";
import ColumnChart from "@/components/charts/ColumnChart";
import {
  cashVsDeployed,
  exposureByBand,
  resolutionLadder,
  riskReward,
} from "@/lib/portfolio";
import PortfolioFilterBar, {
  DEFAULT_PORTFOLIO_FILTERS,
  type PortfolioFilters,
} from "@/components/PortfolioFilterBar";

// Markets closing within this window count as "closing soon".
const SOON_MS = 24 * 60 * 60 * 1000;

function StatCard({
  label,
  value,
  valueClass = "",
  hint,
}: {
  label: string;
  value: string;
  valueClass?: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
        {label}
      </p>
      <p className={`mt-2 text-2xl font-semibold tabular-nums ${valueClass}`}>
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-zinc-400">{hint}</p>}
    </div>
  );
}

function bandMatches(bands: BandKey[], avgPrice: number): boolean {
  return bands.length === 0 || bands.includes(bandOf(avgPrice));
}

function categoryMatches(
  category: string,
  eventSlug: string,
  categories: Record<string, string>
): boolean {
  return category === "all" || (categories[eventSlug] ?? "Other") === category;
}

function isClosingSoon(endDate: string, nowMs: number): boolean {
  const end = Date.parse(endDate);
  return !isNaN(end) && end - nowMs < SOON_MS;
}

function sliceFrom(series: TrendPoint[], startSec: number): TrendPoint[] {
  return startSec <= 0 ? series : series.filter((p) => p.ts >= startSec);
}

export default function PortfolioView({
  summary,
  openPositions,
  closedPositions,
  cash,
  categories,
  categoryList,
  netWorth,
}: {
  summary: AccountSummary;
  openPositions: OpenPosition[];
  closedPositions: ClosedPosition[];
  cash: number | null;
  categories: Record<string, string>;
  categoryList: string[];
  netWorth: NetWorthHistory | null;
}) {
  const [filters, setFilters] = useState<PortfolioFilters>(DEFAULT_PORTFOLIO_FILTERS);
  const nowMs = useMemo(() => Date.now(), []);
  const nowSec = Math.floor(nowMs / 1000);

  const chartStart = windowStart(filters.dateKey, nowSec);
  const chartCash = useMemo(
    () => (netWorth ? sliceFrom(netWorth.cash, chartStart) : []),
    [netWorth, chartStart]
  );
  const chartValue = useMemo(
    () => (netWorth ? sliceFrom(netWorth.value, chartStart) : []),
    [netWorth, chartStart]
  );

  const filteredOpen = useMemo(
    () =>
      openPositions.filter(
        (p) =>
          categoryMatches(filters.category, p.eventSlug, categories) &&
          bandMatches(filters.bands, p.avgPrice) &&
          (filters.result === "all" ||
            (filters.result === "winning" ? p.cashPnl > 0 : p.cashPnl < 0)) &&
          (filters.closing === "all" || isClosingSoon(p.endDate, nowMs))
      ),
    [openPositions, filters, categories, nowMs]
  );

  const filteredClosed = useMemo(
    () =>
      closedPositions.filter(
        (p) =>
          categoryMatches(filters.category, p.eventSlug, categories) &&
          bandMatches(filters.bands, p.avgPrice) &&
          (filters.result === "all" ||
            (filters.result === "winning"
              ? p.realizedPnl > 0
              : p.realizedPnl < 0)) &&
          // Closed positions have already resolved — never "closing soon".
          filters.closing === "all"
      ),
    [closedPositions, filters, categories]
  );

  // Composition/risk charts describe the live book, so they follow the same
  // filters as the positions table.
  const composition = useMemo(
    () => (cash === null ? null : cashVsDeployed(cash, filteredOpen)),
    [cash, filteredOpen]
  );
  const ladder = useMemo(() => resolutionLadder(filteredOpen, nowMs), [filteredOpen, nowMs]);
  const bandExposure = useMemo(() => exposureByBand(filteredOpen), [filteredOpen]);
  const risk = useMemo(() => riskReward(filteredOpen), [filteredOpen]);

  const money = (v: number) => formatUsd(v, true);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_230px] lg:items-start">
      <div className="order-2 space-y-6 lg:order-1">
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {/* Cash is unknown when the RPC fails; show nothing rather than a
              positions-only figure that would read as a complete total. */}
          <StatCard
            label="Portfolio"
            value={cash === null ? "—" : formatUsd(summary.portfolioValue + cash, true)}
            hint="Positions plus cash"
          />
          <StatCard
            label="Cash"
            value={cash === null ? "—" : formatUsd(cash, true)}
            hint="USDC in wallet"
          />
          <StatCard
            label="Positions"
            value={formatUsd(summary.portfolioValue, true)}
            hint="Open positions at current prices"
          />
          <StatCard
            label="Unrealized PnL"
            value={formatSignedUsd(summary.unrealizedPnl, true)}
            valueClass={pnlColor(summary.unrealizedPnl)}
            hint="Across open positions"
          />
        </section>

        {/* Where is my money? */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
          <Card title="Net worth" subtitle="Cash + portfolio value over time">
            {netWorth ? (
              <NetWorthChart
                cash={chartCash}
                value={chartValue}
                formatValue={money}
              />
            ) : (
              <p className="flex items-center justify-center py-12 text-sm text-zinc-400">
                Not available right now.
              </p>
            )}
            {risk.atRisk > 0 && (
              <p className="mt-3 border-t border-zinc-200 pt-3 text-[13px] text-zinc-400 dark:border-zinc-800">
                <span className="font-medium tabular-nums text-zinc-600 dark:text-zinc-300">
                  {money(risk.atRisk)}
                </span>{" "}
                at risk to win{" "}
                <span className="font-medium tabular-nums text-emerald-500">
                  {money(risk.toWin)}
                </span>
                {risk.multiple !== null && (
                  <>
                    {" · "}
                    <span className="font-medium tabular-nums text-zinc-600 dark:text-zinc-300">
                      {risk.multiple < 10
                        ? `${risk.multiple.toFixed(1)}x`
                        : `${Math.round(risk.multiple)}x`}
                    </span>{" "}
                    on what&apos;s at stake
                  </>
                )}
              </p>
            )}
          </Card>

          <Card title="Cash vs in play" subtitle="How much capital is deployed">
            {composition ? (
              <DonutChart slices={composition} formatValue={money} />
            ) : (
              <p className="flex items-center justify-center py-12 text-sm text-zinc-400">
                Cash balance unavailable.
              </p>
            )}
          </Card>
        </div>

        {/* What risk am I carrying? */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Card title="Time to resolution" subtitle="When this capital frees up">
            <ColumnChart items={ladder} formatValue={money} />
          </Card>

          <Card title="Exposure by probability band" subtitle="Probability at entry">
            <BarList
              items={bandExposure.map((s) => ({
                key: s.key,
                label: s.label,
                sublabel: s.sublabel,
                value: s.value,
                display: money(s.value),
              }))}
            />
          </Card>
        </div>

        <PositionTables
          openPositions={filteredOpen}
          closedPositions={filteredClosed}
        />
      </div>

      <aside className="order-1 lg:order-2 lg:sticky lg:top-8 lg:self-start">
        <PortfolioFilterBar
          categories={categoryList}
          filters={filters}
          onChange={setFilters}
        />
      </aside>
    </div>
  );
}

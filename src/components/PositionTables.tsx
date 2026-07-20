"use client";

import { useState } from "react";
import type { ClosedPosition, OpenPosition } from "@/lib/polymarket";
import {
  formatCents,
  formatDate,
  formatPercent,
  formatShares,
  formatSignedUsd,
  formatUsd,
  pnlColor,
} from "@/lib/format";

function MarketCell({
  icon,
  title,
  outcome,
  eventSlug,
}: {
  icon: string;
  title: string;
  outcome: string;
  eventSlug: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      {icon ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={icon}
          alt=""
          className="h-9 w-9 shrink-0 rounded-lg object-cover"
        />
      ) : (
        <span className="h-9 w-9 shrink-0 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
      )}
      <div className="min-w-0">
        <a
          href={`https://polymarket.com/event/${eventSlug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block truncate text-sm font-medium text-zinc-900 hover:underline dark:text-zinc-100"
          title={title}
        >
          {title}
        </a>
        <span className="text-xs text-zinc-400">{outcome}</span>
      </div>
    </div>
  );
}

function Th({
  children,
  align = "right",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={`whitespace-nowrap px-4 py-3 text-xs font-medium uppercase tracking-wide text-zinc-400 ${
        align === "left" ? "text-left" : "text-right"
      }`}
    >
      {children}
    </th>
  );
}

const td = "whitespace-nowrap px-4 py-3 text-right text-sm tabular-nums";

function PositionsTable({ positions }: { positions: OpenPosition[] }) {
  if (positions.length === 0) {
    return <Empty label="No open positions." />;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] border-collapse">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-800">
            <Th align="left">Market</Th>
            <Th>Shares</Th>
            <Th>Avg</Th>
            <Th>Now</Th>
            <Th>Value</Th>
            <Th>PnL</Th>
          </tr>
        </thead>
        <tbody>
          {positions.map((p) => (
            <tr
              key={p.asset}
              className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/60"
            >
              <td className="max-w-[220px] px-4 py-3 text-left">
                <MarketCell
                  icon={p.icon}
                  title={p.title}
                  outcome={p.outcome}
                  eventSlug={p.eventSlug}
                />
              </td>
              <td className={td}>{formatShares(p.size)}</td>
              <td className={`${td} text-zinc-500 dark:text-zinc-400`}>
                {formatCents(p.avgPrice)}
              </td>
              <td className={td}>{formatCents(p.curPrice)}</td>
              <td className={td}>{formatUsd(p.currentValue)}</td>
              <td className={`${td} font-medium ${pnlColor(p.cashPnl)}`}>
                {formatSignedUsd(p.cashPnl)}
                <span className="ml-1.5 text-xs font-normal opacity-70">
                  {formatPercent(p.percentPnl)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ClosedTable({ positions }: { positions: ClosedPosition[] }) {
  if (positions.length === 0) {
    return <Empty label="No closed positions." />;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] border-collapse">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-800">
            <Th align="left">Market</Th>
            <Th>Bought</Th>
            <Th>Avg</Th>
            <Th>Closed</Th>
            <Th>Realized PnL</Th>
          </tr>
        </thead>
        <tbody>
          {positions.map((p) => (
            <tr
              key={`${p.asset}-${p.timestamp}`}
              className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/60"
            >
              <td className="max-w-[220px] px-4 py-3 text-left">
                <MarketCell
                  icon={p.icon}
                  title={p.title}
                  outcome={p.outcome}
                  eventSlug={p.eventSlug}
                />
              </td>
              <td className={td}>{formatUsd(p.totalBought * p.avgPrice)}</td>
              <td className={`${td} text-zinc-500 dark:text-zinc-400`}>
                {formatCents(p.avgPrice)}
              </td>
              <td className={`${td} text-zinc-500 dark:text-zinc-400`}>
                {formatDate(p.timestamp)}
              </td>
              <td className={`${td} font-medium ${pnlColor(p.realizedPnl)}`}>
                {p.partial && (
                  <span
                    title="Partial sale — the rest of this position was held"
                    className="mr-2 rounded-full bg-zinc-500/10 px-2 py-0.5 text-xs font-medium text-zinc-500 dark:text-zinc-400"
                  >
                    partial
                  </span>
                )}
                {p.claimable && (
                  <span className="mr-2 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    claimable
                  </span>
                )}
                {formatSignedUsd(p.realizedPnl)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <p className="px-4 py-12 text-center text-sm text-zinc-400">{label}</p>
  );
}

export default function PositionTables({
  openPositions,
  closedPositions,
}: {
  openPositions: OpenPosition[];
  closedPositions: ClosedPosition[];
}) {
  const [tab, setTab] = useState<"positions" | "closed">(
    openPositions.length > 0 ? "positions" : "closed"
  );

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-1 border-b border-zinc-200 px-3 pt-3 dark:border-zinc-800">
        {(
          [
            ["positions", `Positions (${openPositions.length})`],
            ["closed", `Closed (${closedPositions.length})`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded-t-lg px-4 py-2.5 text-sm font-medium transition ${
              tab === key
                ? "border-b-2 border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100"
                : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            }`}
          >
            {label}
          </button>
        ))}
        {tab === "closed" && closedPositions.length >= 100 && (
          <span className="ml-auto px-4 text-xs text-zinc-400">
            showing 100 most recent
          </span>
        )}
      </div>
      {tab === "positions" ? (
        <PositionsTable positions={openPositions} />
      ) : (
        <ClosedTable positions={closedPositions} />
      )}
    </section>
  );
}

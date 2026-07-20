"use client";

import { useState } from "react";
import type { OpenPosition } from "@/lib/polymarket";
import { allocationByPosition } from "@/lib/portfolio";
import { formatPercent, formatSignedUsd, formatUsd, pnlColor } from "@/lib/format";
import Card from "@/components/Card";
import BarList from "@/components/charts/BarList";
import ViewToggle, { type CardView } from "@/components/charts/ViewToggle";

const th =
  "whitespace-nowrap px-2 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-zinc-400";
const td = "whitespace-nowrap px-2 py-2 text-left text-sm tabular-nums";

/**
 * Allocation across open positions. The bar view caps at the largest handful,
 * so the table view exists to show every position once a book outgrows a chart.
 */
export default function AllocationCard({ positions }: { positions: OpenPosition[] }) {
  const [view, setView] = useState<CardView>("bar");

  const bars = allocationByPosition(positions);
  const total = positions.reduce((s, p) => s + p.currentValue, 0);
  const rows = [...positions]
    .filter((p) => p.currentValue > 0)
    .sort((a, b) => b.currentValue - a.currentValue);

  const money = (v: number) => formatUsd(v, true);

  return (
    <Card
      title="Allocation"
      subtitle={
        view === "bar"
          ? "Value now, with a marker at what was paid"
          : `${rows.length} open position${rows.length === 1 ? "" : "s"} by share of book`
      }
      action={<ViewToggle view={view} onChange={setView} />}
    >
      {view === "bar" ? (
        <BarList
          items={bars.map((s) => ({
            key: s.key,
            label: s.label,
            sublabel: s.sublabel,
            value: s.value,
            display: money(s.value),
            tone: s.tone,
            reference: s.reference,
            referenceLabel: s.reference ? `Paid ${money(s.reference)}` : undefined,
          }))}
        />
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-zinc-400">No open positions.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th className={th}>Market</th>
                <th className={th}>Cost</th>
                <th className={th}>Value</th>
                <th className={th}>Share</th>
                <th className={th}>PnL</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr
                  key={p.asset}
                  className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/60"
                >
                  <td className="max-w-[260px] px-2 py-2 text-left text-sm">
                    <a
                      href={`https://polymarket.com/event/${p.eventSlug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block truncate text-zinc-900 hover:underline dark:text-zinc-100"
                      title={p.title}
                    >
                      {p.title}
                    </a>
                    <span className="text-xs text-zinc-400">{p.outcome}</span>
                  </td>
                  <td className={`${td} text-zinc-500 dark:text-zinc-400`}>
                    {money(p.initialValue)}
                  </td>
                  <td className={td}>{money(p.currentValue)}</td>
                  <td className={`${td} text-zinc-500 dark:text-zinc-400`}>
                    {total > 0 ? `${((p.currentValue / total) * 100).toFixed(1)}%` : "—"}
                  </td>
                  <td className={`${td} font-medium ${pnlColor(p.cashPnl)}`}>
                    {formatSignedUsd(p.cashPnl, true)}
                    <span className="ml-1.5 text-xs font-normal opacity-70">
                      {formatPercent(p.percentPnl)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

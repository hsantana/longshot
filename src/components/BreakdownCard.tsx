"use client";

import { useState } from "react";
import type { BreakdownRow } from "@/lib/analytics";
import { formatSignedUsd, formatUsd, pnlColor } from "@/lib/format";
import Card from "@/components/Card";
import BarList from "@/components/charts/BarList";
import ViewToggle, { type CardView } from "@/components/charts/ViewToggle";

const th =
  "whitespace-nowrap px-2 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-zinc-400";
const td = "whitespace-nowrap px-2 py-2 text-left text-sm tabular-nums";

export default function BreakdownCard({
  title,
  subtitle,
  rows,
  labelHeader,
}: {
  title: string;
  subtitle?: string;
  rows: BreakdownRow[];
  labelHeader: string;
}) {
  const [view, setView] = useState<CardView>("bar");

  return (
    <Card title={title} subtitle={subtitle} action={<ViewToggle view={view} onChange={setView} />}>
      {view === "bar" ? (
        <BarList
          mode="diverging"
          items={rows.map((r) => ({
            label: r.label,
            sublabel: r.sublabel,
            value: r.pnl,
            display: formatSignedUsd(r.pnl, true),
          }))}
        />
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-zinc-400">No data in this window.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th className={th}>{labelHeader}</th>
                <th className={th} title="Plays entered / exits in this window">
                  Entries / Exits
                </th>
                <th className={th}>PnL</th>
                <th className={th}>Volume</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.key}
                  className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/60"
                >
                  <td className="whitespace-nowrap px-2 py-2 text-left text-sm">
                    <span className="block text-zinc-900 dark:text-zinc-100">{r.label}</span>
                    {r.sublabel && (
                      <span className="block text-xs text-zinc-400">{r.sublabel}</span>
                    )}
                  </td>
                  <td className={`${td} text-zinc-500 dark:text-zinc-400`}>
                    {r.entries}/{r.exits}
                  </td>
                  <td className={`${td} font-medium ${pnlColor(r.pnl)}`}>
                    {formatSignedUsd(r.pnl, true)}
                  </td>
                  <td className={`${td} text-zinc-500 dark:text-zinc-400`}>
                    {formatUsd(r.volume, true)}
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

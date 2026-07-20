"use client";

import { useState } from "react";
import type { BreakdownRow } from "@/lib/analytics";
import { formatSignedUsd, formatUsd, pnlColor } from "@/lib/format";
import Card from "@/components/Card";
import BarList from "@/components/charts/BarList";

const th =
  "whitespace-nowrap px-1.5 py-2 text-right text-[11px] font-medium uppercase tracking-wide text-zinc-400";
const td = "whitespace-nowrap px-1.5 py-2 text-right text-sm tabular-nums";

function Toggle({
  view,
  onChange,
}: {
  view: "bar" | "table";
  onChange: (v: "bar" | "table") => void;
}) {
  return (
    <div className="flex items-center gap-1">
      {(["bar", "table"] as const).map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          aria-label={v === "bar" ? "Bar chart" : "Table"}
          title={v === "bar" ? "Bar chart" : "Table"}
          className={`rounded-md p-1.5 transition ${
            view === v
              ? "bg-zinc-200 text-zinc-900 dark:bg-zinc-700 dark:text-zinc-100"
              : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          }`}
        >
          {v === "bar" ? (
            <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">
              <rect x="1" y="9" width="3.5" height="6" rx="1" />
              <rect x="6.25" y="5" width="3.5" height="10" rx="1" />
              <rect x="11.5" y="1" width="3.5" height="14" rx="1" />
            </svg>
          ) : (
            <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">
              <rect x="1" y="2" width="14" height="2.2" rx="1" />
              <rect x="1" y="7" width="14" height="2.2" rx="1" />
              <rect x="1" y="11.8" width="14" height="2.2" rx="1" />
            </svg>
          )}
        </button>
      ))}
    </div>
  );
}

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
  const [view, setView] = useState<"bar" | "table">("bar");

  return (
    <Card title={title} subtitle={subtitle} action={<Toggle view={view} onChange={setView} />}>
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
                <th className={`${th} text-left`}>{labelHeader}</th>
                <th className={th}>Entries</th>
                <th className={th}>Exits</th>
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
                  <td className="whitespace-nowrap px-1.5 py-2 text-left text-sm">
                    <span className="text-zinc-900 dark:text-zinc-100">{r.label}</span>
                    {r.sublabel && (
                      <span className="ml-1.5 text-xs text-zinc-400">{r.sublabel}</span>
                    )}
                  </td>
                  <td className={`${td} text-zinc-500 dark:text-zinc-400`}>{r.entries}</td>
                  <td className={`${td} text-zinc-500 dark:text-zinc-400`}>{r.exits}</td>
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

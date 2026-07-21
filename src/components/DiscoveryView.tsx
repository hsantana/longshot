"use client";

import { useEffect, useState } from "react";
import DiscoveryFilters from "@/components/DiscoveryFilters";
import {
  DEFAULT_FILTERS,
  MAX_ROWS,
  formatChance,
  formatCountdown,
  formatPayoff,
  formatScore,
  rankRows,
  type DiscoveryFilters as Filters,
  type DiscoveryMarket,
  type OutcomeRow,
} from "@/lib/discovery";

type Status = "loading" | "ready" | "error";

const POLL_MS = 60_000;

function openMarket(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

export default function DiscoveryView() {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [markets, setMarkets] = useState<DiscoveryMarket[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [now, setNow] = useState(() => Date.now());
  const [refreshedAt, setRefreshedAt] = useState<number | null>(null);

  // Refetch on range change and every 60s; other filters apply client-side.
  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const res = await fetch(`/api/discovery?range=${filters.range}`);
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as {
          markets: DiscoveryMarket[];
          refreshedAt: number;
        };
        if (!active) return;
        setMarkets(data.markets);
        setRefreshedAt(data.refreshedAt);
        setNow(Date.now());
        setStatus("ready");
      } catch {
        if (active) setStatus((s) => (s === "loading" ? "error" : s));
      }
    }

    load();
    const id = setInterval(load, POLL_MS);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [filters.range]);

  const rows = rankRows(markets, filters, now);

  const countLabel =
    rows.length === MAX_ROWS ? `${MAX_ROWS}+ outcomes` : `${rows.length} outcomes`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Discovery</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          A screener ranking Polymarket outcomes by return per day of waiting.
        </p>
      </div>

      <DiscoveryFilters filters={filters} onChange={setFilters} />

      <div className="flex items-center justify-between text-sm text-zinc-500 dark:text-zinc-400">
        <span className="font-medium text-zinc-700 dark:text-zinc-200">
          {status === "loading" ? "Loading…" : countLabel}
        </span>
        {refreshedAt && (
          <span className="tabular-nums">
            Updated {new Date(refreshedAt).toLocaleTimeString()}
          </span>
        )}
      </div>

      {status === "error" ? (
        <Empty
          title="Couldn't load markets"
          hint="Polymarket's API didn't respond. It may be rate-limiting — it'll retry shortly."
        />
      ) : status === "ready" && rows.length === 0 ? (
        <Empty
          title="No outcomes match"
          hint="Try lowering the minimum winning chance, widening the close window, or dropping the volume floor."
        />
      ) : (
        <ResultsTable rows={rows} now={now} />
      )}
    </div>
  );
}

function Empty({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-200 py-16 text-center dark:border-zinc-800">
      <p className="text-lg font-medium">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-sm text-zinc-400">{hint}</p>
    </div>
  );
}

function ResultsTable({ rows, now }: { rows: OutcomeRow[]; now: number }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-400 dark:border-zinc-800">
            <th className="px-4 py-3 font-medium">Outcome</th>
            <th className="px-4 py-3 text-right font-medium">Chance</th>
            <th className="px-4 py-3 text-right font-medium">Closes in</th>
            <th className="px-4 py-3 text-right font-medium">Payoff</th>
            <th className="px-4 py-3 text-right font-medium">% per day</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.key}
              onClick={() => openMarket(row.url)}
              onKeyDown={(e) => e.key === "Enter" && openMarket(row.url)}
              tabIndex={0}
              role="link"
              className="cursor-pointer border-b border-zinc-100 outline-none transition last:border-0 hover:bg-zinc-50 focus-visible:bg-zinc-50 dark:border-zinc-800/60 dark:hover:bg-zinc-800/40 dark:focus-visible:bg-zinc-800/40"
            >
              <td className="px-4 py-3">
                <div className="font-medium text-zinc-900 dark:text-zinc-100">
                  {row.outcome}
                </div>
                <div className="mt-0.5 line-clamp-1 text-xs text-zinc-400">
                  {row.question}
                </div>
              </td>
              <td className="px-4 py-3 text-right text-base font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
                {formatChance(row.price)}
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-zinc-500 dark:text-zinc-400">
                {formatCountdown(row.closeMs, now)}
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-zinc-500 dark:text-zinc-400">
                {formatPayoff(row.payoff)}
              </td>
              <td className="px-4 py-3 text-right font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                {formatScore(row.score)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

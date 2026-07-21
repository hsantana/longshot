"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import DiscoveryFilters from "@/components/DiscoveryFilters";
import { CANONICAL_CATEGORIES } from "@/lib/categories";
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

// The fetch is scoped by range + category selection. A narrowed category set is
// passed as `cats` so Gamma returns that batch; "all" (or none) fetches the
// top-by-volume across everything. This string is also the fetch identity used
// to tell when the gathered batch is stale vs the current filters.
function fetchQuery(f: Filters): string {
  const p = new URLSearchParams({ range: f.range });
  const isSubset =
    f.categories.length > 0 && f.categories.length < CANONICAL_CATEGORIES.length;
  if (isSubset) p.set("cats", f.categories.join(","));
  return p.toString();
}

export default function DiscoveryView() {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [markets, setMarkets] = useState<DiscoveryMarket[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [now, setNow] = useState(() => Date.now());
  const [refreshedAt, setRefreshedAt] = useState<number | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [fetching, setFetching] = useState(false);
  // The fetch query that produced the current batch; used to flag staleness.
  const [loadedQuery, setLoadedQuery] = useState<string | null>(null);

  // Keep the latest filters reachable from the stable `load` callback without
  // making `load` depend on them (which would refetch on every filter change).
  const filtersRef = useRef(filters);
  useEffect(() => {
    filtersRef.current = filters;
  });

  const load = useCallback(async () => {
    const query = fetchQuery(filtersRef.current);
    setFetching(true);
    try {
      const res = await fetch(`/api/discovery?${query}`);
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as {
        markets: DiscoveryMarket[];
        refreshedAt: number;
      };
      setMarkets(data.markets);
      setRefreshedAt(data.refreshedAt);
      setNow(Date.now());
      setStatus("ready");
      setLoadedQuery(query);
    } catch {
      setStatus((s) => (s === "loading" ? "error" : s));
    } finally {
      setFetching(false);
    }
  }, []);

  // One fetch on mount. After that, fetching is manual (Search) or on the
  // auto-refresh interval — filter changes only re-filter the gathered batch.
  useEffect(() => {
    // load() sets a loading flag synchronously; that's the intended on-mount
    // fetch, not a cascading-render bug.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(id);
  }, [autoRefresh, load]);

  const rows = rankRows(markets, filters, now);

  const countLabel =
    rows.length === MAX_ROWS ? `${MAX_ROWS}+ outcomes` : `${rows.length} outcomes`;

  // The gathered batch is scoped by range + category; if those changed since
  // the last fetch, a Search will pull a batch that matches.
  const stale = loadedQuery !== null && fetchQuery(filters) !== loadedQuery;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Discovery</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          A screener ranking Polymarket outcomes by return per day of waiting.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_242px] lg:items-start">
        <div className="order-2 space-y-4 lg:order-1">
          <div className="flex items-center justify-between gap-3 text-sm text-zinc-500 dark:text-zinc-400">
            <span className="font-medium text-zinc-700 dark:text-zinc-200">
              {status === "loading" ? "Loading…" : countLabel}
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setAutoRefresh((v) => !v)}
                aria-pressed={autoRefresh}
                title="Refresh the market data every 60 seconds"
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                  autoRefresh
                    ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                    : "border-zinc-200 text-zinc-400 hover:text-zinc-600 dark:border-zinc-700 dark:hover:text-zinc-300"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    autoRefresh
                      ? "bg-emerald-500"
                      : "bg-zinc-300 dark:bg-zinc-600"
                  }`}
                />
                Auto-refresh {autoRefresh ? "on" : "off"}
              </button>
              {refreshedAt && (
                <span className="whitespace-nowrap tabular-nums">
                  Updated {new Date(refreshedAt).toLocaleTimeString()}
                </span>
              )}
            </div>
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

        <aside className="order-1 lg:order-2 lg:sticky lg:top-8 lg:self-start lg:max-h-[calc(100vh_-_4rem)] lg:overflow-y-auto lg:pr-1">
          <DiscoveryFilters
            filters={filters}
            onChange={setFilters}
            onSearch={load}
            fetching={fetching}
            stale={stale}
          />
        </aside>
      </div>
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
      <table className="w-full min-w-[680px] text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-400 dark:border-zinc-800">
            <th className="px-4 py-3 font-medium">Outcome</th>
            <th className="px-4 py-3 text-right font-medium">Chance</th>
            <th className="px-4 py-3 text-right font-medium">Closes in</th>
            <th className="px-4 py-3 text-right font-medium">Payoff</th>
            <th className="px-4 py-3 text-right font-medium">% per day</th>
            <th className="px-2 py-3">
              <span className="sr-only">Copy link</span>
            </th>
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
                <div className="flex items-center gap-2">
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {row.outcome}
                  </span>
                  <span className="shrink-0 rounded-full border border-zinc-200 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-400 dark:border-zinc-700 dark:text-zinc-500">
                    {row.category}
                  </span>
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
              <td className="px-2 py-3">
                <CopyButton url={row.url} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CopyButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  function copy(e: React.MouseEvent | React.KeyboardEvent) {
    // Don't let the click bubble to the row (which opens the market).
    e.stopPropagation();

    const done = () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    };

    // execCommand fallback for contexts where the async clipboard API is
    // unavailable or blocked (older browsers, non-secure origins).
    const fallback = () => {
      try {
        const ta = document.createElement("textarea");
        ta.value = url;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        done();
      } catch {}
    };

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(done, fallback);
    } else {
      fallback();
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") copy(e);
        else e.stopPropagation();
      }}
      aria-label={copied ? "Link copied" : "Copy market link"}
      title={copied ? "Copied!" : "Copy link"}
      className="rounded-md p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 focus-visible:bg-zinc-100 focus-visible:outline-none dark:hover:bg-zinc-800 dark:hover:text-zinc-200 dark:focus-visible:bg-zinc-800"
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
    </button>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
      <path d="M10.5 5.5V4A1.5 1.5 0 0 0 9 2.5H4A1.5 1.5 0 0 0 2.5 4v5A1.5 1.5 0 0 0 4 10.5h1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M3.5 8.5 6.5 11.5 12.5 4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

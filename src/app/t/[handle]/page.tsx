import Link from "next/link";
import type { Metadata } from "next";
import SearchBox from "@/components/SearchBox";
import PositionTables from "@/components/PositionTables";
import { getAccount } from "@/lib/polymarket";
import {
  formatSignedUsd,
  formatUsd,
  pnlColor,
  shortAddress,
} from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const decoded = decodeURIComponent(handle);
  return { title: `${decoded} · Longshot` };
}

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

export default async function TrackerPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const decoded = decodeURIComponent(handle);

  let account: Awaited<ReturnType<typeof getAccount>>;
  let error: string | null = null;
  try {
    account = await getAccount(decoded);
  } catch {
    account = null;
    error =
      "Polymarket's API didn't respond. It may be rate-limiting — try again in a moment.";
  }

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Link
          href="/"
          className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100"
        >
          Longshot<span className="text-emerald-500">.</span>
        </Link>
        <div className="w-full sm:max-w-md">
          <SearchBox compact />
        </div>
      </header>

      {!account ? (
        <div className="mt-24 text-center">
          <p className="text-lg font-medium">
            {error ? "Something went wrong" : `No account found for “${decoded}”`}
          </p>
          <p className="mt-2 text-sm text-zinc-400">
            {error ??
              "Try a Polymarket username or a full 0x wallet address."}
          </p>
        </div>
      ) : (
        <>
          <section className="mt-8 flex items-center gap-4">
            {account.summary.profileImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={account.summary.profileImage}
                alt=""
                className="h-14 w-14 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-200 text-xl font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300">
                {(account.summary.name ?? account.summary.address)
                  .replace(/^0x/, "")
                  .slice(0, 1)
                  .toUpperCase()}
              </span>
            )}
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {account.summary.name ?? shortAddress(account.summary.address)}
              </h1>
              <a
                href={`https://polymarket.com/profile/${account.summary.address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs text-zinc-400 hover:underline"
              >
                {account.summary.address}
              </a>
            </div>
          </section>

          <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              label="Portfolio value"
              value={formatUsd(account.summary.portfolioValue, true)}
              hint="Open positions at current prices"
            />
            <StatCard
              label="Unrealized PnL"
              value={formatSignedUsd(account.summary.unrealizedPnl, true)}
              valueClass={pnlColor(account.summary.unrealizedPnl)}
              hint="Across open positions"
            />
            <StatCard
              label="Realized PnL"
              value={
                account.summary.realizedPnl === null
                  ? "—"
                  : formatSignedUsd(account.summary.realizedPnl, true)
              }
              valueClass={
                account.summary.realizedPnl === null
                  ? ""
                  : pnlColor(account.summary.realizedPnl)
              }
              hint="All-time"
            />
          </section>

          <div className="mt-6">
            <PositionTables
              openPositions={account.openPositions}
              closedPositions={account.closedPositions}
            />
          </div>
        </>
      )}
    </main>
  );
}

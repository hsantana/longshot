import PositionTables from "@/components/PositionTables";
import { cachedGetUsdcBalance, getAccount } from "@/lib/polymarket";
import { formatSignedUsd, formatUsd, pnlColor } from "@/lib/format";

export const dynamic = "force-dynamic";

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

export default async function PortfolioPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  let account: Awaited<ReturnType<typeof getAccount>> = null;
  try {
    account = await getAccount(decodeURIComponent(handle));
  } catch {
    account = null;
  }
  if (!account) return null; // layout renders the error state

  const cash = await cachedGetUsdcBalance(account.summary.address);

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Portfolio value"
          value={formatUsd(account.summary.portfolioValue, true)}
          hint="Open positions at current prices"
        />
        <StatCard
          label="Cash"
          value={cash === null ? "—" : formatUsd(cash, true)}
          hint="USDC in wallet"
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

      <PositionTables
        openPositions={account.openPositions}
        closedPositions={account.closedPositions}
      />
    </div>
  );
}

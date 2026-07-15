import PortfolioView from "@/components/PortfolioView";
import {
  cachedGetFullActivity,
  cachedGetUsdcBalance,
  getAccount,
  getCategories,
} from "@/lib/polymarket";
import { buildNetWorthHistory, type NetWorthHistory } from "@/lib/networth";

export const dynamic = "force-dynamic";

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

  const slugs = [
    ...account.openPositions.map((p) => p.eventSlug),
    ...account.closedPositions.map((p) => p.eventSlug),
  ];
  const [cash, categoryMap, activity] = await Promise.all([
    cachedGetUsdcBalance(account.summary.address),
    getCategories(slugs),
    cachedGetFullActivity(account.summary.address),
  ]);

  const categories = Object.fromEntries(categoryMap);
  const categoryList = [...new Set(Object.values(categories))].sort();

  let netWorth: NetWorthHistory | null = null;
  if (cash !== null) {
    try {
      netWorth = await buildNetWorthHistory(
        activity,
        account.openPositions,
        account.closedPositions,
        cash,
        Math.floor(Date.now() / 1000)
      );
    } catch {
      netWorth = null;
    }
  }

  return (
    <PortfolioView
      summary={account.summary}
      openPositions={account.openPositions}
      closedPositions={account.closedPositions}
      cash={cash}
      categories={categories}
      categoryList={categoryList}
      netWorth={netWorth}
    />
  );
}

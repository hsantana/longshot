// Reconstructs "Cash over time" and "Portfolio value over time" for the
// Portfolio tab's net-worth chart. Polymarket exposes neither history
// directly, so both are derived:
//
// - Cash: replay every activity row (trades, redemptions, yield, deposits,
//   ...) into a running USDC balance, then shift the whole series so the
//   most recent point matches the real on-chain balance. This anchor makes
//   the series self-correcting for any activity type not perfectly modeled
//   below — only the *shape* is derived, the endpoint is exact.
// - Portfolio value: for every asset ever held (open or since-closed), pull
//   its daily price history from the CLOB and its own trade history (to
//   reconstruct shares held per day), multiply and sum across assets. A
//   closed position's contribution stops at its close date. For the tail end
//   of a closed position, the CLOB's price-history often trails off just
//   short of the true settled price (e.g. 0.0045 instead of an eliminated
//   team's real 0) rather than hard-stopping at resolution — past the last
//   available history point, the position's own known final price (from
//   ClosedPosition.curPrice) is used instead, so a large stale share count
//   times a near-zero-but-not-zero price can't inflate the total.

import type { Activity, ClosedPosition, OpenPosition } from "./polymarket";
import { getPriceHistory } from "./polymarket";
import type { TrendPoint } from "./analytics";

const DAY = 86400;

// Each distinct asset ever held costs one price-history subrequest. This
// deployment is on Workers Paid (1,000 subrequests/request); the Portfolio page
// spends ~20-30 subrequests before this, leaving ~970 of headroom. Set to 800
// to cover virtually every account (incl. the most active traders) in a single
// request, while staying clear of the ceiling. Over-cap assets still degrade
// gracefully (caught empty fetch → $0). Genuinely removing the limit needs
// precomputed/stored price history, not a bigger cap.
const MAX_PRICED_ASSETS = 800;

function dayFloor(ts: number): number {
  return Math.floor(ts / DAY) * DAY;
}

function cashDelta(a: Activity): number {
  switch (a.type) {
    case "TRADE":
      return a.side === "BUY" ? -a.usdcSize : a.usdcSize;
    case "REDEEM":
    case "YIELD":
    case "REWARD":
    case "MAKER_REBATE":
    case "TAKER_REBATE":
    case "REFERRAL_REWARD":
    case "DEPOSIT":
    case "MERGE": // merging a complementary token pair back into collateral
      return a.usdcSize;
    case "WITHDRAWAL":
    case "SPLIT": // splitting collateral into a token pair
      return -a.usdcSize;
    default:
      return 0;
  }
}

function buildCashSeries(
  activity: Activity[],
  currentBalance: number,
  nowSec: number
): TrendPoint[] {
  const endDay = dayFloor(nowSec);
  if (activity.length === 0) {
    return [{ ts: endDay, value: currentBalance }];
  }
  const sorted = [...activity].sort((a, b) => a.timestamp - b.timestamp);
  const startDay = dayFloor(sorted[0].timestamp);

  const deltaByDay = new Map<number, number>();
  for (const a of sorted) {
    const day = dayFloor(a.timestamp);
    deltaByDay.set(day, (deltaByDay.get(day) ?? 0) + cashDelta(a));
  }

  const points: TrendPoint[] = [];
  let running = 0;
  for (let day = startDay; day <= endDay; day += DAY) {
    running += deltaByDay.get(day) ?? 0;
    points.push({ ts: day, value: running });
  }

  const offset = currentBalance - points[points.length - 1].value;
  return points.map((p) => ({ ts: p.ts, value: p.value + offset }));
}

interface AssetInfo {
  asset: string;
  /** null = still open (value counts through today). */
  closedAtSec: number | null;
  /** Known final settled price for closed assets; overrides stale price-history tails. */
  finalPrice: number | null;
}

function collectAssets(
  open: OpenPosition[],
  closed: ClosedPosition[],
  cap: number
): { assets: AssetInfo[]; truncated: boolean } {
  const byAsset = new Map<string, AssetInfo>();
  // Closed first, then open overwrites (an asset held again after a full
  // exit should count as currently open, not stopped at the earlier close).
  for (const p of closed) {
    if (!byAsset.has(p.asset)) {
      byAsset.set(p.asset, { asset: p.asset, closedAtSec: p.timestamp, finalPrice: p.curPrice });
    }
  }
  for (const p of open) {
    byAsset.set(p.asset, { asset: p.asset, closedAtSec: null, finalPrice: null });
  }

  const all = [...byAsset.values()];
  // Prioritize open positions (always kept), then most-recently-closed.
  all.sort((a, b) => {
    if (a.closedAtSec === null && b.closedAtSec !== null) return -1;
    if (a.closedAtSec !== null && b.closedAtSec === null) return 1;
    return (b.closedAtSec ?? 0) - (a.closedAtSec ?? 0);
  });

  return { assets: all.slice(0, cap), truncated: all.length > cap };
}

async function assetValueByDay(
  info: AssetInfo,
  trades: Activity[],
  nowSec: number
): Promise<Map<number, number>> {
  const history = await getPriceHistory(info.asset);
  const contribution = new Map<number, number>();
  if (trades.length === 0) return contribution;

  const sortedTrades = [...trades].sort((a, b) => a.timestamp - b.timestamp);
  const priceByDay = new Map<number, number>();
  for (const pt of history) priceByDay.set(dayFloor(pt.t), pt.p);
  const lastHistoryDay = history.length > 0 ? dayFloor(history[history.length - 1].t) : null;

  const sharesByDay = new Map<number, number>();
  let shares = 0;
  for (const t of sortedTrades) {
    shares += t.side === "BUY" ? t.size : -t.size;
    sharesByDay.set(dayFloor(t.timestamp), shares);
  }

  const startDay = dayFloor(sortedTrades[0].timestamp);
  const endDay = dayFloor(info.closedAtSec ?? nowSec);
  let runningShares = 0;
  let runningPrice = history.length > 0 ? history[0].p : 0;
  for (let day = startDay; day <= endDay; day += DAY) {
    runningShares = sharesByDay.get(day) ?? runningShares;
    if (info.finalPrice !== null && (lastHistoryDay === null || day > lastHistoryDay)) {
      runningPrice = info.finalPrice;
    } else {
      runningPrice = priceByDay.get(day) ?? runningPrice;
    }
    contribution.set(day, runningShares * runningPrice);
  }
  return contribution;
}

export interface NetWorthHistory {
  cash: TrendPoint[];
  value: TrendPoint[];
  /** True when more assets were ever held than the price-history fetch cap. */
  truncated: boolean;
}

export async function buildNetWorthHistory(
  activity: Activity[],
  openPositions: OpenPosition[],
  closedPositions: ClosedPosition[],
  currentCashBalance: number,
  nowSec: number
): Promise<NetWorthHistory> {
  const cash = buildCashSeries(activity, currentCashBalance, nowSec);
  const { assets, truncated } = collectAssets(openPositions, closedPositions, MAX_PRICED_ASSETS);

  const tradesByAsset = new Map<string, Activity[]>();
  for (const a of activity) {
    if (a.type !== "TRADE") continue;
    const arr = tradesByAsset.get(a.asset);
    if (arr) arr.push(a);
    else tradesByAsset.set(a.asset, [a]);
  }

  const perAsset = await Promise.allSettled(
    assets.map((info) => assetValueByDay(info, tradesByAsset.get(info.asset) ?? [], nowSec))
  );

  const valueByDay = new Map<number, number>();
  for (const result of perAsset) {
    if (result.status !== "fulfilled") continue;
    for (const [day, v] of result.value) {
      valueByDay.set(day, (valueByDay.get(day) ?? 0) + v);
    }
  }

  const startDay = cash.length > 0 ? cash[0].ts : dayFloor(nowSec);
  const endDay = dayFloor(nowSec);
  const value: TrendPoint[] = [];
  let runningValue = 0;
  for (let day = startDay; day <= endDay; day += DAY) {
    runningValue = valueByDay.get(day) ?? runningValue;
    value.push({ ts: day, value: runningValue });
  }

  return { cash, value, truncated };
}

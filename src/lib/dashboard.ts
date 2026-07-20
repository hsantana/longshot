// Server-side assembly of the data both dashboard views need.

import { cache } from "react";
import {
  cachedGetTrades,
  getAccount,
  getCategories,
} from "./polymarket";
import {
  toOpenPlays,
  toPlays,
  toPositionPlays,
  toTradeLites,
  type Play,
  type PositionPlay,
  type TradeLite,
} from "./analytics";

/** Matches the default cap in getTrades. */
const TRADE_CAP = 3000;

export interface Dashboard {
  /** Dated cash events (each sale/resolution) — drives the PnL line + calendar. */
  plays: Play[];
  /** One per position entered — drives bands, markets, return per $1. */
  positionPlays: PositionPlay[];
  trades: TradeLite[];
  categories: string[];
  truncated: boolean;
  /** Trade history hit the fetch cap, so older history is missing. */
  tradesTruncated: boolean;
}

export const getDashboard = cache(
  async (handle: string): Promise<Dashboard | null> => {
    const account = await getAccount(handle);
    if (!account) return null;

    const trades = await cachedGetTrades(account.summary.address);
    const slugs = [
      ...account.closedPositions.map((p) => p.eventSlug),
      ...account.openPositions.map((p) => p.eventSlug),
      ...trades.map((t) => t.eventSlug),
    ];
    const categories = await getCategories(slugs);

    const plays = [
      ...toPlays(account.closedPositions, categories),
      ...toOpenPlays(account.openPositions, categories),
    ];
    const positionPlays = toPositionPlays(
      account.openPositions,
      account.closedPositions,
      trades,
      categories
    );
    const tradeLites = toTradeLites(trades, categories);

    const categoryList = [
      ...new Set([...plays.map((p) => p.category), ...tradeLites.map((t) => t.category)]),
    ].sort();

    return {
      plays,
      positionPlays,
      trades: tradeLites,
      categories: categoryList,
      truncated: account.closedPositions.length >= 500 || trades.length >= TRADE_CAP,
      tradesTruncated: trades.length >= TRADE_CAP,
    };
  }
);

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
  toTradeLites,
  type Play,
  type TradeLite,
} from "./analytics";

export interface Dashboard {
  plays: Play[];
  trades: TradeLite[];
  categories: string[];
  truncated: boolean;
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
    const tradeLites = toTradeLites(trades, categories);

    const categoryList = [
      ...new Set([...plays.map((p) => p.category), ...tradeLites.map((t) => t.category)]),
    ].sort();

    return {
      plays,
      trades: tradeLites,
      categories: categoryList,
      truncated: account.closedPositions.length >= 500 || trades.length >= 3000,
    };
  }
);

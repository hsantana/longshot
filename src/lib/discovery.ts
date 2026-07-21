// Pure logic for the Discovery screener. No fetching here — everything
// operates on the normalized markets returned by getDiscoveryMarkets().
//
// The screener ranks outcomes by how much you make per day of waiting:
//   payoff = (1 - price) / price     (return if the outcome resolves YES)
//   days   = max(daysUntilClose, 1/1440)   (floor at one minute)
//   score  = payoff / days * 100     ("% per day")

import { CANONICAL_CATEGORIES } from "./categories";

const MINUTE_IN_DAYS = 1 / 1440;

/** Time-to-close ranges. Each is a window measured in days from now. */
export const DATE_RANGES = [
  { key: "week", label: "< 1 week", minDays: 0, maxDays: 7 },
  { key: "month", label: "< 1 month", minDays: 0, maxDays: 30 },
  { key: "6month", label: "1–6 months", minDays: 30, maxDays: 180 },
] as const;

export type RangeKey = (typeof DATE_RANGES)[number]["key"];

export function rangeWindow(key: RangeKey): { minDays: number; maxDays: number } {
  const r = DATE_RANGES.find((d) => d.key === key) ?? DATE_RANGES[0];
  return { minDays: r.minDays, maxDays: r.maxDays };
}

/** 24h-volume floor stops for the liquidity filter. 0 = show everything. */
export const VOLUME_STOPS = [
  { value: 0, label: "Any" },
  { value: 1_000, label: "$1k+" },
  { value: 10_000, label: "$10k+" },
  { value: 50_000, label: "$50k+" },
  { value: 100_000, label: "$100k+" },
] as const;

/** Preset shortcuts under the minimum-chance slider. */
export const CHANCE_PRESETS = [25, 50, 75, 90, 95, 99] as const;

export const MAX_ROWS = 100;

export interface DiscoveryFilters {
  /** Minimum winning chance, as a whole percent (1..99). */
  minChancePct: number;
  range: RangeKey;
  /** Selected categories. Empty set is treated as "all". */
  categories: string[];
  /** Minimum 24h volume in dollars. */
  minVolume: number;
}

export const DEFAULT_FILTERS: DiscoveryFilters = {
  minChancePct: 90,
  range: "week",
  categories: [...CANONICAL_CATEGORIES],
  minVolume: 1_000,
};

/** A market as returned by the API, one per Polymarket market. */
export interface DiscoveryMarket {
  /** Unique per market (conditionId). Distinct from eventSlug, which is shared
   * across markets grouped under one event — so this alone is safe for keys. */
  id: string;
  question: string;
  eventSlug: string;
  category: string;
  /** Resolution time, unix milliseconds. */
  closeMs: number;
  volume24hr: number;
  liquidity: number;
  outcomes: string[];
  /** Prices aligned to `outcomes`, each 0..1. */
  prices: number[];
  url: string;
}

/** One row in the screener — a single outcome (token side) of a market. */
export interface OutcomeRow {
  key: string;
  outcome: string;
  question: string;
  category: string;
  /** Current price = winning chance, 0..1. */
  price: number;
  closeMs: number;
  daysLeft: number;
  payoff: number;
  score: number;
  volume24hr: number;
  url: string;
}

/** Explode a market into one row per outcome side, dropping degenerate prices. */
export function toRows(market: DiscoveryMarket, now: number): OutcomeRow[] {
  const rows: OutcomeRow[] = [];
  const n = Math.min(market.outcomes.length, market.prices.length);
  for (let i = 0; i < n; i++) {
    const price = market.prices[i];
    // 0 and 1 are degenerate: 0 never wins, 1 pays nothing.
    if (!(price > 0 && price < 1)) continue;

    const daysLeft = (market.closeMs - now) / 86_400_000;
    const days = Math.max(daysLeft, MINUTE_IN_DAYS);
    const payoff = (1 - price) / price;
    const score = (payoff / days) * 100;

    rows.push({
      key: `${market.id}:${i}`,
      outcome: market.outcomes[i],
      question: market.question,
      category: market.category,
      price,
      closeMs: market.closeMs,
      daysLeft,
      payoff,
      score,
      volume24hr: market.volume24hr,
      url: market.url,
    });
  }
  return rows;
}

/** Explode, filter (AND across all four), rank by score desc, cap at MAX_ROWS. */
export function rankRows(
  markets: DiscoveryMarket[],
  filters: DiscoveryFilters,
  now: number
): OutcomeRow[] {
  const { minDays, maxDays } = rangeWindow(filters.range);
  // Empty selection means "all" — never filter everything out.
  const catSet =
    filters.categories.length > 0 ? new Set(filters.categories) : null;

  const rows: OutcomeRow[] = [];
  for (const market of markets) {
    for (const row of toRows(market, now)) {
      if (row.price * 100 < filters.minChancePct) continue;
      if (row.daysLeft < minDays || row.daysLeft > maxDays) continue;
      if (catSet && !catSet.has(row.category)) continue;
      if (row.volume24hr < filters.minVolume) continue;
      rows.push(row);
    }
  }

  rows.sort((a, b) => b.score - a.score);
  return rows.slice(0, MAX_ROWS);
}

/** "3.1%" — return if the outcome resolves YES. */
export function formatPayoff(payoff: number): string {
  return `${(payoff * 100).toFixed(1)}%`;
}

/** "9,600%" — the ranking score, no decimals once it's large. */
export function formatScore(score: number): string {
  const digits = score >= 100 ? 0 : score >= 10 ? 1 : 2;
  return `${score.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}%`;
}

/** "97%" — current price as a percent. Keeps a decimal at the extremes so a
 * 99.5% outcome never rounds to a misleading "100%" (nor a 0.4% to "0%"). */
export function formatChance(price: number): string {
  const pct = price * 100;
  return `${pct < 1 || pct > 99 ? pct.toFixed(1) : Math.round(pct)}%`;
}

/** Compact duration like "4m", "2d 6h", "3w". Never a date. */
export function formatCountdown(closeMs: number, now: number): string {
  let s = Math.floor((closeMs - now) / 1000);
  if (s <= 0) return "closing";

  const d = Math.floor(s / 86_400);
  s -= d * 86_400;
  const h = Math.floor(s / 3_600);
  s -= h * 3_600;
  const m = Math.floor(s / 60);

  if (d >= 7) {
    const w = Math.floor(d / 7);
    const rd = d - w * 7;
    return rd ? `${w}w ${rd}d` : `${w}w`;
  }
  if (d > 0) return h ? `${d}d ${h}h` : `${d}d`;
  if (h > 0) return m ? `${h}h ${m}m` : `${h}h`;
  return `${Math.max(m, 1)}m`;
}

// Pure derivations for the Performance and Style views. No fetching here —
// everything operates on plays (closed positions) and trades passed in,
// both already enriched with their category server-side.

import type { ClosedPosition, OpenPosition, Trade } from "./polymarket";

/** A play = a position (open or closed), enriched with its category. */
export interface Play {
  title: string;
  eventSlug: string;
  outcome: string;
  /** Average entry price = probability at entry (0..1). */
  entryPrice: number;
  /** Dollars staked. */
  staked: number;
  /** Realized PnL for closed plays; unrealized (mark-to-market) for open. */
  pnl: number;
  /** Dollars returned (closed) or current value (open). */
  returned: number;
  /** Close/resolution time (unix seconds); 0 for open plays (no close date). */
  ts: number;
  category: string;
  status: "open" | "closed";
  /**
   * A partial sale out of a position rather than a whole play closing. Counts
   * toward PnL and the calendar, but excluded from win rate — a trim isn't its
   * own win/loss; the position is scored once, as a whole play.
   */
  partial?: boolean;
}

/** Slimmed trade passed to the client (full Trade objects are heavy at 3k rows). */
export interface TradeLite {
  ts: number;
  side: "BUY" | "SELL";
  usd: number;
  price: number;
  outcome: string;
  category: string;
}

export const BANDS = [
  { key: "longshot", label: "Longshot", range: "0–5%", min: 0, max: 0.05 },
  { key: "low", label: "Low", range: "5–25%", min: 0.05, max: 0.25 },
  { key: "medium", label: "Medium", range: "25–50%", min: 0.25, max: 0.5 },
  { key: "medhigh", label: "Medium-high", range: "50–75%", min: 0.5, max: 0.75 },
  { key: "high", label: "High", range: "75–95%", min: 0.75, max: 0.95 },
  { key: "nearlock", label: "Near-lock", range: "95–100%", min: 0.95, max: 1.01 },
] as const;

export type BandKey = (typeof BANDS)[number]["key"];

export function bandOf(price: number): BandKey {
  const band = BANDS.find((b) => price >= b.min && price < b.max);
  return (band ?? BANDS[BANDS.length - 1]).key;
}

export const DATE_PRESETS = [
  { key: "7", label: "7D", days: 7 },
  { key: "30", label: "30D", days: 30 },
  { key: "90", label: "90D", days: 90 },
  { key: "365", label: "1Y", days: 365 },
  { key: "all", label: "All", days: null },
] as const;

export type DateKey = (typeof DATE_PRESETS)[number]["key"];

export interface Filters {
  category: string; // "all" or a category name
  dateKey: DateKey;
  bands: BandKey[]; // empty = all bands
  side: "both" | "yes" | "no";
  status: "all" | "open" | "closed";
}

export const DEFAULT_FILTERS: Filters = {
  category: "all",
  dateKey: "30",
  bands: [],
  side: "both",
  status: "all",
};

export function toPlays(
  closed: ClosedPosition[],
  categories: Map<string, string>
): Play[] {
  return closed.map((p) => {
    const staked = p.totalBought * p.avgPrice;
    return {
      title: p.title,
      eventSlug: p.eventSlug,
      outcome: p.outcome,
      entryPrice: p.avgPrice,
      staked,
      pnl: p.realizedPnl,
      returned: staked + p.realizedPnl,
      ts: p.timestamp,
      category: categories.get(p.eventSlug) ?? "Other",
      status: "closed" as const,
      partial: p.partial,
    };
  });
}

/** Open positions as plays: PnL is unrealized, no close date. */
export function toOpenPlays(
  open: OpenPosition[],
  categories: Map<string, string>
): Play[] {
  return open.map((p) => ({
    title: p.title,
    eventSlug: p.eventSlug,
    outcome: p.outcome,
    entryPrice: p.avgPrice,
    staked: p.initialValue,
    pnl: p.cashPnl,
    returned: p.currentValue,
    ts: 0,
    category: categories.get(p.eventSlug) ?? "Other",
    status: "open" as const,
  }));
}

export function toTradeLites(
  trades: Trade[],
  categories: Map<string, string>
): TradeLite[] {
  return trades.map((t) => ({
    ts: t.timestamp,
    side: t.side,
    usd: t.usdcSize,
    price: t.price,
    outcome: t.outcome,
    category: categories.get(t.eventSlug) ?? "Other",
  }));
}

export function windowStart(dateKey: DateKey, nowSec: number): number {
  const preset = DATE_PRESETS.find((p) => p.key === dateKey);
  return preset?.days ? nowSec - preset.days * 86400 : 0;
}

function sideMatches(side: Filters["side"], outcome: string): boolean {
  if (side === "both") return true;
  const o = outcome.toLowerCase();
  return side === "yes" ? o !== "no" : o === "no";
}

export function filterPlays(plays: Play[], filters: Filters, nowSec: number): Play[] {
  const start = windowStart(filters.dateKey, nowSec);
  return plays.filter(
    (p) =>
      (filters.status === "all" || p.status === filters.status) &&
      // Open plays have no close date; the date window applies to closed ones.
      (p.status === "open" || p.ts >= start) &&
      (filters.category === "all" || p.category === filters.category) &&
      (filters.bands.length === 0 || filters.bands.includes(bandOf(p.entryPrice))) &&
      sideMatches(filters.side, p.outcome)
  );
}

export function filterTrades(
  trades: TradeLite[],
  filters: Filters,
  nowSec: number
): TradeLite[] {
  const start = windowStart(filters.dateKey, nowSec);
  return trades.filter(
    (t) =>
      t.ts >= start &&
      (filters.category === "all" || t.category === filters.category) &&
      (filters.bands.length === 0 || filters.bands.includes(bandOf(t.price))) &&
      sideMatches(filters.side, t.outcome)
  );
}

// ---------- Performance ----------

export interface TrendPoint {
  ts: number;
  value: number;
}

/**
 * Running total as a daily time series over the window (one point per day,
 * carrying the total forward), so the line is continuous rather than jumping
 * between play timestamps.
 */
export function cumulativePnlSeries(
  allPlays: Play[],
  startSec: number,
  nowSec: number
): TrendPoint[] {
  const plays = allPlays.filter((p) => p.status === "closed");
  if (plays.length === 0) return [];
  const byDay = new Map<number, number>();
  for (const p of plays) {
    const day = Math.floor(p.ts / 86400) * 86400;
    byDay.set(day, (byDay.get(day) ?? 0) + p.pnl);
  }
  const firstPlayDay = Math.min(...byDay.keys());
  const startDay = Math.floor(Math.max(startSec, 1) / 86400) * 86400;
  const from = startSec > 0 ? Math.min(startDay, firstPlayDay) : firstPlayDay;
  const to = Math.floor(nowSec / 86400) * 86400;
  const points: TrendPoint[] = [];
  let cum = 0;
  for (let d = from; d <= to; d += 86400) {
    cum += byDay.get(d) ?? 0;
    points.push({ ts: d, value: cum });
  }
  return points;
}

export interface DayCell {
  /** ISO date (UTC) */
  date: string;
  net: number;
  wins: number;
  losses: number;
  winsPnl: number;
  lossesPnl: number;
  opened: number;
}

export function dayKey(tsSec: number): string {
  return new Date(tsSec * 1000).toISOString().slice(0, 10);
}

/** One entry per day that had any activity: resolutions and/or opens (BUY trades). */
export function calendarDays(
  allPlays: Play[],
  trades: TradeLite[]
): Map<string, DayCell> {
  const plays = allPlays.filter((p) => p.status === "closed");
  const days = new Map<string, DayCell>();
  const get = (key: string): DayCell => {
    let d = days.get(key);
    if (!d) {
      d = { date: key, net: 0, wins: 0, losses: 0, winsPnl: 0, lossesPnl: 0, opened: 0 };
      days.set(key, d);
    }
    return d;
  };
  for (const p of plays) {
    const d = get(dayKey(p.ts));
    d.net += p.pnl;
    if (p.pnl >= 0) {
      d.wins += 1;
      d.winsPnl += p.pnl;
    } else {
      d.losses += 1;
      d.lossesPnl += p.pnl;
    }
  }
  for (const t of trades) {
    if (t.side === "BUY") get(dayKey(t.ts)).opened += 1;
  }
  return days;
}

export interface BandStat {
  key: BandKey;
  label: string;
  range: string;
  count: number;
  pnl: number;
}

export function bandDistribution(plays: Play[]): BandStat[] {
  return BANDS.map((b) => {
    const inBand = plays.filter((p) => bandOf(p.entryPrice) === b.key);
    return {
      key: b.key,
      label: b.label,
      range: b.range,
      count: inBand.length,
      pnl: inBand.reduce((s, p) => s + p.pnl, 0),
    };
  });
}

/** PnL (from plays) and traded volume (from trades) per market category. */
export function categoryBreakdown(
  plays: Play[],
  trades: TradeLite[]
): { label: string; pnl: number; volume: number }[] {
  const map = new Map<string, { pnl: number; volume: number }>();
  const get = (label: string) => {
    let e = map.get(label);
    if (!e) {
      e = { pnl: 0, volume: 0 };
      map.set(label, e);
    }
    return e;
  };
  for (const p of plays) get(p.category).pnl += p.pnl;
  for (const t of trades) get(t.category).volume += t.usd;
  return [...map.entries()]
    .map(([label, e]) => ({ label, ...e }))
    .sort((a, b) => b.pnl - a.pnl);
}

// ---------- Style ----------

export interface StylePoint {
  /** Mean probability at entry across plays (0..1). Low = risky. */
  avgEntry: number;
  /** Closed plays per week over the filtered window. */
  playsPerWeek: number;
  plays: number;
}

export function stylePoint(
  plays: Play[],
  filters: Filters,
  nowSec: number
): StylePoint | null {
  if (plays.length === 0) return null;
  const avgEntry = plays.reduce((s, p) => s + p.entryPrice, 0) / plays.length;
  const dated = plays.filter((p) => p.ts > 0);
  const start = windowStart(filters.dateKey, nowSec);
  const earliest =
    start > 0
      ? start
      : dated.length > 0
        ? Math.min(...dated.map((p) => p.ts))
        : nowSec - 30 * 86400;
  const weeks = Math.max((nowSec - earliest) / (7 * 86400), 1 / 7);
  return { avgEntry, playsPerWeek: dated.length / weeks, plays: plays.length };
}

function weeklyBuckets(allPlays: Play[]): Map<number, Play[]> {
  const plays = allPlays.filter((p) => p.ts > 0);
  const buckets = new Map<number, Play[]>();
  for (const p of plays) {
    const week = Math.floor(p.ts / (7 * 86400)) * 7 * 86400;
    const arr = buckets.get(week);
    if (arr) arr.push(p);
    else buckets.set(week, [p]);
  }
  return buckets;
}

export function winRate(allPlays: Play[]): number | null {
  // Partial sales are excluded: trimming a position isn't a separate win/loss,
  // the position is scored once as a whole play when it fully closes.
  const plays = allPlays.filter((p) => p.status === "closed" && !p.partial);
  if (plays.length === 0) return null;
  return plays.filter((p) => p.pnl > 0).length / plays.length;
}

export function winRateTrend(plays: Play[]): TrendPoint[] {
  return [...weeklyBuckets(plays).entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([ts, arr]) => ({ ts, value: (winRate(arr) ?? 0) * 100 }));
}

export function returnRatio(plays: Play[]): number | null {
  const staked = plays.reduce((s, p) => s + p.staked, 0);
  if (staked === 0) return null;
  return plays.reduce((s, p) => s + p.returned, 0) / staked;
}

export function returnRatioTrend(plays: Play[]): TrendPoint[] {
  return [...weeklyBuckets(plays).entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([ts, arr]) => ({ ts, value: returnRatio(arr) ?? 0 }));
}

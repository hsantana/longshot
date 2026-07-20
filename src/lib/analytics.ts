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

// ---------- Position-level plays ----------
//
// A *play* is a position you entered — one per asset — as opposed to the dated
// cash events in `Play[]` (each sale/resolution), which drive the PnL line and
// calendar. Plays are anchored on their entry date and counted once no matter
// how many times you trimmed out of them.
//
// (Re-entering an asset after fully exiting is still folded into one play;
// splitting those into separate plays is deliberately deferred.)

export interface PositionPlay {
  asset: string;
  title: string;
  eventSlug: string;
  outcome: string;
  category: string;
  /** Weighted average buy price = probability at entry (0..1). */
  entryPrice: number;
  /** First BUY (unix seconds) — what the date filter matches on. */
  entryTs: number;
  /** Last exit (unix seconds); 0 while still held. */
  exitTs: number;
  staked: number;
  /** Realized across every exit, plus unrealized on anything still held. */
  pnl: number;
  returned: number;
  status: "open" | "closed";
}

/**
 * Fold every position into one play per asset.
 *
 * `staked` comes from the open position when one remains (its `totalBought`
 * already covers shares since sold); otherwise from the closed rows, which are
 * disjoint — resolution rows cover only the shares still held at resolution,
 * partial rows only the shares sold that day — so they sum without
 * double-counting.
 */
export function toPositionPlays(
  open: OpenPosition[],
  closed: ClosedPosition[],
  trades: Trade[],
  categories: Map<string, string>
): PositionPlay[] {
  const firstBuy = new Map<string, number>();
  for (const t of trades) {
    if (t.side !== "BUY") continue;
    const prev = firstBuy.get(t.asset);
    if (prev === undefined || t.timestamp < prev) firstBuy.set(t.asset, t.timestamp);
  }

  const openByAsset = new Map(open.map((p) => [p.asset, p]));
  const closedByAsset = new Map<string, ClosedPosition[]>();
  for (const p of closed) {
    const arr = closedByAsset.get(p.asset);
    if (arr) arr.push(p);
    else closedByAsset.set(p.asset, [p]);
  }

  const assets = new Set([...openByAsset.keys(), ...closedByAsset.keys()]);
  const plays: PositionPlay[] = [];

  for (const asset of assets) {
    const o = openByAsset.get(asset);
    const rows = closedByAsset.get(asset) ?? [];
    const ref = o ?? rows[0];
    if (!ref) continue;

    const staked = o
      ? o.totalBought * o.avgPrice
      : rows.reduce((s, r) => s + r.totalBought * r.avgPrice, 0);
    const pnl =
      (o ? o.cashPnl : 0) + rows.reduce((s, r) => s + r.realizedPnl, 0);

    // Without a BUY in the fetched window, fall back to the earliest event we
    // do have so the play isn't silently dropped by the date filter.
    const entryTs =
      firstBuy.get(asset) ??
      (rows.length > 0 ? Math.min(...rows.map((r) => r.timestamp)) : 0);

    plays.push({
      asset,
      title: ref.title,
      eventSlug: ref.eventSlug,
      outcome: ref.outcome,
      category: categories.get(ref.eventSlug) ?? "Other",
      entryPrice: ref.avgPrice,
      entryTs,
      exitTs: o || rows.length === 0 ? 0 : Math.max(...rows.map((r) => r.timestamp)),
      staked,
      pnl,
      returned: staked + pnl,
      status: o ? "open" : "closed",
    });
  }

  return plays;
}

export function filterPositionPlays(
  plays: PositionPlay[],
  filters: Filters,
  nowSec: number
): PositionPlay[] {
  const start = windowStart(filters.dateKey, nowSec);
  return plays.filter(
    (p) =>
      (filters.status === "all" || p.status === filters.status) &&
      p.entryTs >= start &&
      (filters.category === "all" || p.category === filters.category) &&
      (filters.bands.length === 0 || filters.bands.includes(bandOf(p.entryPrice))) &&
      sideMatches(filters.side, p.outcome)
  );
}

/**
 * Best and worst fully-closed plays by PnL, ranked over positions that
 * *closed* in the window (so a position entered long ago but exited now
 * counts, same basis as the PnL KPI).
 */
export function bestAndWorstPlays(
  plays: PositionPlay[],
  filters: Filters,
  nowSec: number,
  n = 5
): { best: PositionPlay[]; worst: PositionPlay[] } {
  const start = windowStart(filters.dateKey, nowSec);
  const closed = plays.filter(
    (p) =>
      p.status === "closed" &&
      p.exitTs >= start &&
      (filters.category === "all" || p.category === filters.category) &&
      (filters.bands.length === 0 || filters.bands.includes(bandOf(p.entryPrice))) &&
      sideMatches(filters.side, p.outcome)
  );
  const sorted = [...closed].sort((a, b) => b.pnl - a.pnl);
  return {
    best: sorted.filter((p) => p.pnl > 0).slice(0, n),
    worst: sorted
      .filter((p) => p.pnl < 0)
      .slice(-n)
      .reverse(),
  };
}

export interface BreakdownRow {
  key: string;
  label: string;
  /** Secondary label, e.g. a band's percentage range. */
  sublabel?: string;
  /** Plays entered in the window. */
  entries: number;
  /** Exits (sales + resolutions) in the window. */
  exits: number;
  /** Money that moved in the window, plus unrealized — matches the PnL KPI. */
  pnl: number;
  volume: number;
}

/**
 * Breakdown by probability band at entry. Entries are entry-anchored plays;
 * exits, PnL and volume are event-based, so this reconciles with the PnL KPI.
 */
export function bandBreakdown(
  entered: PositionPlay[],
  events: Play[],
  trades: TradeLite[]
): BreakdownRow[] {
  return BANDS.map((b) => {
    const inBand = (price: number) => bandOf(price) === b.key;
    return {
      key: b.key,
      label: b.label,
      sublabel: b.range,
      entries: entered.filter((p) => inBand(p.entryPrice)).length,
      exits: events.filter((p) => p.status === "closed" && inBand(p.entryPrice)).length,
      pnl: events
        .filter((p) => inBand(p.entryPrice))
        .reduce((s, p) => s + p.pnl, 0),
      volume: trades.filter((t) => inBand(t.price)).reduce((s, t) => s + t.usd, 0),
    };
  });
}

/**
 * Breakdown by market category. Same basis as bandBreakdown: entries are
 * entry-anchored, everything else is event-based.
 */
export function categoryBreakdown(
  entered: PositionPlay[],
  events: Play[],
  trades: TradeLite[]
): BreakdownRow[] {
  const map = new Map<string, BreakdownRow>();
  const get = (label: string) => {
    let e = map.get(label);
    if (!e) {
      e = { key: label, label, entries: 0, exits: 0, pnl: 0, volume: 0 };
      map.set(label, e);
    }
    return e;
  };
  for (const p of entered) get(p.category).entries += 1;
  for (const p of events) {
    const row = get(p.category);
    row.pnl += p.pnl;
    if (p.status === "closed") row.exits += 1;
  }
  for (const t of trades) get(t.category).volume += t.usd;
  return [...map.values()].sort((a, b) => b.pnl - a.pnl);
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

/**
 * Share of exits that were profitable — a hit rate, counted per exit (each
 * sale and each resolution), not per play. Selling out of one position in
 * three profitable waves counts as three winning exits.
 */
export function winRate(allPlays: Play[]): number | null {
  const exits = allPlays.filter((p) => p.status === "closed");
  if (exits.length === 0) return null;
  return exits.filter((p) => p.pnl > 0).length / exits.length;
}

export function winRateTrend(plays: Play[]): TrendPoint[] {
  return [...weeklyBuckets(plays).entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([ts, arr]) => ({ ts, value: (winRate(arr) ?? 0) * 100 }));
}

/**
 * Dollars back per dollar staked, across whole positions — including the
 * current value of anything still held, so an unsold winner still counts.
 */
export function returnRatio(plays: PositionPlay[]): number | null {
  const staked = plays.reduce((s, p) => s + p.staked, 0);
  if (staked === 0) return null;
  return plays.reduce((s, p) => s + p.returned, 0) / staked;
}

export function returnRatioTrend(plays: PositionPlay[]): TrendPoint[] {
  const buckets = new Map<number, PositionPlay[]>();
  for (const p of plays) {
    if (p.entryTs <= 0) continue;
    const week = Math.floor(p.entryTs / (7 * 86400)) * 7 * 86400;
    const arr = buckets.get(week);
    if (arr) arr.push(p);
    else buckets.set(week, [p]);
  }
  return [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([ts, arr]) => ({ ts, value: returnRatio(arr) ?? 0 }));
}

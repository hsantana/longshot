// Derivations for the Portfolio view's composition and risk charts. These all
// describe the *live book* — open positions at current value — as opposed to
// analytics.ts, which is about plays and realized history.

import { BANDS, bandOf, type BandKey } from "./analytics";
import type { OpenPosition } from "./polymarket";

export interface Slice {
  key: string;
  label: string;
  sublabel?: string;
  value: number;
  /** Signals whether the underlying position is up or down. */
  tone?: "positive" | "negative" | "neutral";
  /** Reference value drawn as a marker on the bar, e.g. cost basis. */
  reference?: number;
  /** Compact label for axis use, where the full label is too long. */
  shortLabel?: string;
  /** Optional leading icon. */
  icon?: string;
}

export interface RiskReward {
  /** Current value of the book — what's forfeited if it all goes to zero. */
  atRisk: number;
  /** Net upside if every open position resolves in your favour. */
  toWin: number;
  /** toWin / atRisk. Null when nothing is at risk. */
  multiple: number | null;
}

/**
 * "X at risk to win Y" across open positions.
 *
 * Every share settles at $1, so a position's gross payout is simply its share
 * count. Upside is reported net of what the position is worth today — quoting
 * the gross figure would badly flatter near-locks (a 95c position would read
 * "win $100" when the real upside is $5).
 */
export function riskReward(openPositions: OpenPosition[]): RiskReward {
  let atRisk = 0;
  let toWin = 0;
  for (const p of openPositions) {
    atRisk += p.currentValue;
    toWin += p.size - p.currentValue;
  }
  return {
    atRisk,
    toWin,
    multiple: atRisk > 0 ? (atRisk + toWin) / atRisk : null,
  };
}

/** Capital split between cash and money deployed into positions. */
export function cashVsDeployed(
  cash: number,
  openPositions: OpenPosition[]
): Slice[] {
  const deployed = openPositions.reduce((s, p) => s + p.currentValue, 0);
  return [
    { key: "cash", label: "Cash", value: cash },
    { key: "deployed", label: "In play", value: deployed },
  ];
}

/**
 * Largest positions by current value, coloured by whether each is up or down —
 * so concentration and winners/losers read from one chart. Anything past
 * `top` is folded into "Other" rather than dropped.
 */
export function allocationByPosition(
  openPositions: OpenPosition[],
  top = 8
): Slice[] {
  const sorted = [...openPositions]
    .filter((p) => p.currentValue > 0)
    .sort((a, b) => b.currentValue - a.currentValue);

  const head: Slice[] = sorted.slice(0, top).map((p) => ({
    key: p.asset,
    label: p.title,
    sublabel: p.outcome,
    value: p.currentValue,
    icon: p.icon,
    tone: p.cashPnl >= 0 ? "positive" : "negative",
    // Cost basis, drawn as a marker so each bar shows what was paid against
    // what it's worth now.
    reference: p.initialValue,
  }));

  const rest = sorted.slice(top);
  if (rest.length > 0) {
    head.push({
      key: "__other",
      label: `Other (${rest.length})`,
      value: rest.reduce((s, p) => s + p.currentValue, 0),
      tone: "neutral",
      reference: rest.reduce((s, p) => s + p.initialValue, 0),
    });
  }
  return head;
}

const HOUR_MS = 3600 * 1000;
const DAY_MS = 24 * HOUR_MS;

// Ordered thresholds — a position lands in the first bucket its remaining time
// falls under. "Past due" catches markets whose end date has passed but which
// haven't resolved yet; without it they'd be misreported as resolving today.
const LADDER = [
  { key: "overdue", label: "Past due", short: "due", maxMs: 0 },
  { key: "24h", label: "Next 24h", short: "24h", maxMs: DAY_MS },
  { key: "week", label: "This week", short: "1w", maxMs: 7 * DAY_MS },
  { key: "month", label: "This month", short: "1m", maxMs: 30 * DAY_MS },
  { key: "q", label: "1–3 months", short: "3m", maxMs: 90 * DAY_MS },
  { key: "h1", label: "3–6 months", short: "6m", maxMs: 180 * DAY_MS },
  { key: "y1", label: "6–12 months", short: "1y", maxMs: 365 * DAY_MS },
  { key: "beyond", label: "Over a year", short: "1y+", maxMs: Infinity },
] as const;

/**
 * Capital by when it frees up — the prediction-market equivalent of a bond
 * maturity ladder. The "Past due" bucket is dropped when empty, since it's an
 * exception state rather than part of the ladder.
 */
export function resolutionLadder(
  openPositions: OpenPosition[],
  nowMs: number
): Slice[] {
  const totals = new Map<string, number>(LADDER.map((b) => [b.key, 0]));
  for (const p of openPositions) {
    const end = Date.parse(p.endDate);
    const ms = isNaN(end) ? Infinity : end - nowMs;
    const bucket = LADDER.find((b) => ms < b.maxMs) ?? LADDER[LADDER.length - 1];
    totals.set(bucket.key, (totals.get(bucket.key) ?? 0) + p.currentValue);
  }
  return LADDER.filter((b) => b.key !== "overdue" || (totals.get(b.key) ?? 0) > 0).map(
    (b) => ({
      key: b.key,
      label: b.label,
      shortLabel: b.short,
      value: totals.get(b.key) ?? 0,
    })
  );
}

/** Capital by probability band at entry — how speculative the live book is. */
export function exposureByBand(openPositions: OpenPosition[]): Slice[] {
  const totals = new Map<BandKey, number>();
  for (const p of openPositions) {
    const band = bandOf(p.avgPrice);
    totals.set(band, (totals.get(band) ?? 0) + p.currentValue);
  }
  return BANDS.map((b) => ({
    key: b.key,
    label: b.label,
    sublabel: b.range,
    value: totals.get(b.key) ?? 0,
  }));
}

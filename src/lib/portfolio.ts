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
    tone: p.cashPnl >= 0 ? "positive" : "negative",
  }));

  const rest = sorted.slice(top);
  if (rest.length > 0) {
    head.push({
      key: "__other",
      label: `Other (${rest.length})`,
      value: rest.reduce((s, p) => s + p.currentValue, 0),
      tone: "neutral",
    });
  }
  return head;
}

const HOUR_MS = 3600 * 1000;
const LADDER = [
  { key: "24h", label: "Next 24h", maxMs: 24 * HOUR_MS },
  { key: "week", label: "This week", maxMs: 7 * 24 * HOUR_MS },
  { key: "month", label: "This month", maxMs: 30 * 24 * HOUR_MS },
  { key: "later", label: "Later", maxMs: Infinity },
] as const;

/**
 * Capital by when it frees up — the prediction-market equivalent of a bond
 * maturity ladder. Positions already past their end date but not yet resolved
 * fall in the nearest bucket.
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
  return LADDER.map((b) => ({
    key: b.key,
    label: b.label,
    value: totals.get(b.key) ?? 0,
  }));
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

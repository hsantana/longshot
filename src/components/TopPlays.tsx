"use client";

import type { PositionPlay } from "@/lib/analytics";
import { formatSignedUsd, formatUsd, pnlColor } from "@/lib/format";
import Card from "@/components/Card";

function PlayList({
  heading,
  plays,
  empty,
}: {
  heading: string;
  plays: PositionPlay[];
  empty: string;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-400">
        {heading}
      </p>
      {plays.length === 0 ? (
        <p className="py-6 text-center text-sm text-zinc-400">{empty}</p>
      ) : (
        <ul className="space-y-2">
          {plays.map((p) => (
            <li key={p.asset} className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <a
                  href={`https://polymarket.com/event/${p.eventSlug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block truncate text-sm text-zinc-900 hover:underline dark:text-zinc-100"
                  title={p.title}
                >
                  {p.title}
                </a>
                <span className="text-xs text-zinc-400">
                  {p.outcome} · {formatUsd(p.staked, true)} staked
                </span>
              </div>
              <span
                className={`shrink-0 text-sm font-medium tabular-nums ${pnlColor(p.pnl)}`}
              >
                {formatSignedUsd(p.pnl, true)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function TopPlays({
  best,
  worst,
}: {
  best: PositionPlay[];
  worst: PositionPlay[];
}) {
  return (
    <Card title="Top & worst plays" subtitle="Closed positions, by PnL">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <PlayList heading="Top plays" plays={best} empty="No winning plays closed." />
        <PlayList heading="Worst plays" plays={worst} empty="No losing plays closed." />
      </div>
    </Card>
  );
}

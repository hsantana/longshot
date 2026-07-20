"use client";

import { useState } from "react";
import type { Slice } from "@/lib/portfolio";

const PLOT_H = 150;

/**
 * Vertical columns over ordered buckets — the right idiom for a distribution
 * across time, where left-to-right carries "sooner to later" and empty buckets
 * read as gaps on the axis rather than consuming a row each.
 */
export default function ColumnChart({
  items,
  formatValue,
}: {
  items: Slice[];
  formatValue: (v: number) => string;
}) {
  const [hover, setHover] = useState<number | null>(null);

  const max = Math.max(...items.map((i) => i.value), 0);
  if (items.length === 0 || max <= 0) {
    return (
      <p className="flex items-center justify-center py-12 text-sm text-zinc-400">
        Nothing open to resolve.
      </p>
    );
  }

  return (
    <div>
      <div className="flex items-end gap-1.5" style={{ height: PLOT_H }}>
        {items.map((item, i) => {
          const pct = (item.value / max) * 100;
          const active = hover === i;
          return (
            <div
              key={item.key}
              className="flex h-full flex-1 flex-col justify-end"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              {item.value > 0 && (
                <span
                  className={`mb-1 text-center text-[10px] tabular-nums transition ${
                    active ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400"
                  }`}
                >
                  {formatValue(item.value)}
                </span>
              )}
              <div
                title={`${item.label}: ${formatValue(item.value)}`}
                className={`w-full rounded-t transition ${
                  item.value > 0
                    ? active
                      ? "bg-emerald-400 dark:bg-emerald-300"
                      : "bg-emerald-500 dark:bg-emerald-400"
                    : "bg-zinc-200 dark:bg-zinc-800"
                }`}
                // Empty buckets keep a sliver so the rung is still visible.
                style={{ height: item.value > 0 ? `${Math.max(pct, 2)}%` : 2 }}
              />
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex gap-1.5 border-t border-zinc-200 pt-2 dark:border-zinc-800">
        {items.map((item, i) => (
          <span
            key={item.key}
            title={item.label}
            className={`flex-1 text-center text-[11px] tabular-nums transition ${
              hover === i ? "text-zinc-600 dark:text-zinc-300" : "text-zinc-400"
            }`}
          >
            {item.shortLabel ?? item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

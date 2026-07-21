"use client";

import { CANONICAL_CATEGORIES } from "@/lib/categories";
import {
  CHANCE_PRESETS,
  DATE_RANGES,
  VOLUME_STOPS,
  type DiscoveryFilters,
} from "@/lib/discovery";
import { chipClass as chip } from "@/lib/ui";

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
        {label}
      </p>
      {children}
    </div>
  );
}

export default function DiscoveryFilters({
  filters,
  onChange,
}: {
  filters: DiscoveryFilters;
  onChange: (f: DiscoveryFilters) => void;
}) {
  const volumeIndex = Math.max(
    0,
    VOLUME_STOPS.findIndex((s) => s.value === filters.minVolume)
  );

  function toggleCategory(cat: string) {
    const categories = filters.categories.includes(cat)
      ? filters.categories.filter((c) => c !== cat)
      : [...filters.categories, cat];
    onChange({ ...filters, categories });
  }

  const allSelected = filters.categories.length === CANONICAL_CATEGORIES.length;

  return (
    <div className="grid gap-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 lg:grid-cols-2">
      {/* Minimum winning chance */}
      <Group label="Minimum winning chance">
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={1}
            max={99}
            step={1}
            value={filters.minChancePct}
            onChange={(e) =>
              onChange({ ...filters, minChancePct: Number(e.target.value) })
            }
            className="w-full accent-zinc-900 dark:accent-zinc-100"
            aria-label="Minimum winning chance"
          />
          <span className="w-10 shrink-0 text-right text-sm font-semibold tabular-nums">
            {filters.minChancePct}%
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {CHANCE_PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onChange({ ...filters, minChancePct: p })}
              className={chip(filters.minChancePct === p)}
            >
              {p}%
            </button>
          ))}
        </div>
      </Group>

      {/* Closes within */}
      <Group label="Closes within">
        <div className="flex flex-wrap gap-1.5">
          {DATE_RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => onChange({ ...filters, range: r.key })}
              className={chip(filters.range === r.key)}
            >
              {r.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-zinc-400">
          Longer windows reload the list from Polymarket.
        </p>
      </Group>

      {/* 24h volume */}
      <Group label="Minimum 24h volume">
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={VOLUME_STOPS.length - 1}
            step={1}
            value={volumeIndex}
            onChange={(e) =>
              onChange({
                ...filters,
                minVolume: VOLUME_STOPS[Number(e.target.value)].value,
              })
            }
            className="w-full accent-zinc-900 dark:accent-zinc-100"
            aria-label="Minimum 24h volume"
          />
          <span className="w-14 shrink-0 text-right text-sm font-semibold tabular-nums">
            {VOLUME_STOPS[volumeIndex].label}
          </span>
        </div>
      </Group>

      {/* Category */}
      <Group label="Category">
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() =>
              onChange({
                ...filters,
                categories: allSelected ? [] : [...CANONICAL_CATEGORIES],
              })
            }
            className={chip(allSelected)}
          >
            All
          </button>
          {CANONICAL_CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => toggleCategory(c)}
              className={chip(filters.categories.includes(c))}
            >
              {c}
            </button>
          ))}
        </div>
      </Group>
    </div>
  );
}

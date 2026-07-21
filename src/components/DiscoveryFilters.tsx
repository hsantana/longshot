"use client";

import { useState } from "react";
import { CANONICAL_CATEGORIES } from "@/lib/categories";
import {
  CHANCE_PRESETS,
  DATE_RANGES,
  PRIMARY_CATEGORIES,
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

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 12 12"
      className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
    >
      <path d="M3 4.5 6 7.5 9 4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <circle cx="7" cy="7" r="4.5" />
      <path d="m10.5 10.5 3 3" strokeLinecap="round" />
    </svg>
  );
}

/** Vertical filter rail (sidebar on desktop, stacked block on mobile). */
export default function DiscoveryFilters({
  filters,
  onChange,
  onSearch,
  fetching,
  stale,
}: {
  filters: DiscoveryFilters;
  onChange: (f: DiscoveryFilters) => void;
  onSearch: () => void;
  fetching: boolean;
  stale: boolean;
}) {
  const [showAllCategories, setShowAllCategories] = useState(false);

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
  const shownCategories = showAllCategories
    ? CANONICAL_CATEGORIES
    : PRIMARY_CATEGORIES;
  const hiddenCount = CANONICAL_CATEGORIES.length - PRIMARY_CATEGORIES.length;

  return (
    <div className="space-y-5 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="space-y-1.5">
        <button
          type="button"
          onClick={onSearch}
          disabled={fetching}
          className={`flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition disabled:opacity-60 ${
            stale
              ? "bg-blue-600 text-white hover:bg-blue-500"
              : "bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          }`}
        >
          <SearchIcon />
          {fetching ? "Searching…" : "Search"}
        </button>
        {stale && !fetching && (
          <p className="text-center text-[11px] text-blue-600 dark:text-blue-400">
            Filters changed — search to pull a matching batch.
          </p>
        )}
      </div>

      <Group label="Minimum winning chance">
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={1}
            max={99}
            step={1}
            value={filters.minChancePct}
            onChange={(e) =>
              onChange({ ...filters, minChancePct: Number(e.target.value) })
            }
            className="w-full min-w-0 accent-zinc-900 dark:accent-zinc-100"
            aria-label="Minimum winning chance"
          />
          <span className="w-9 shrink-0 text-right text-sm font-semibold tabular-nums">
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

      <Group label="Near-certain (99.9%+)">
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => onChange({ ...filters, hideDecided: true })}
            className={chip(filters.hideDecided)}
            title="Hide outcomes already decided but pending settlement"
          >
            Hide
          </button>
          <button
            type="button"
            onClick={() => onChange({ ...filters, hideDecided: false })}
            className={chip(!filters.hideDecided)}
          >
            Show
          </button>
        </div>
      </Group>

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
      </Group>

      <Group label="Minimum 24h volume">
        <div className="flex items-center gap-2">
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
            className="w-full min-w-0 accent-zinc-900 dark:accent-zinc-100"
            aria-label="Minimum 24h volume"
          />
          <span className="w-12 shrink-0 text-right text-sm font-semibold tabular-nums">
            {VOLUME_STOPS[volumeIndex].label}
          </span>
        </div>
      </Group>

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
          {shownCategories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => toggleCategory(c)}
              className={chip(filters.categories.includes(c))}
            >
              {c}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowAllCategories((v) => !v)}
            className={`${chip(false)} inline-flex items-center gap-1`}
            aria-expanded={showAllCategories}
          >
            {showAllCategories ? "Less" : `+${hiddenCount} more`}
            <Chevron open={showAllCategories} />
          </button>
        </div>
      </Group>
    </div>
  );
}

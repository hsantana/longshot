"use client";

import {
  BANDS,
  DATE_PRESETS,
  type BandKey,
  type Filters,
} from "@/lib/analytics";

interface Props {
  categories: string[];
  filters: Filters;
  onChange: (f: Filters) => void;
}

const chip = (active: boolean) =>
  `rounded-full border px-3 py-1 text-xs font-medium transition ${
    active
      ? "border-emerald-600 bg-emerald-600 text-white dark:border-emerald-500 dark:bg-emerald-500 dark:text-zinc-900"
      : "border-zinc-200 text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-zinc-200"
  }`;

export default function FilterBar({ categories, filters, onChange }: Props) {
  function toggleBand(key: BandKey) {
    const bands = filters.bands.includes(key)
      ? filters.bands.filter((b) => b !== key)
      : [...filters.bands, key];
    onChange({ ...filters, bands });
  }

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <label className="flex items-center gap-2 text-xs text-zinc-400">
        Markets
        <select
          value={filters.category}
          onChange={(e) => onChange({ ...filters, category: e.target.value })}
          className="rounded-lg border border-zinc-200 bg-transparent px-2 py-1 text-xs font-medium text-zinc-700 outline-none dark:border-zinc-700 dark:text-zinc-200 dark:[&>option]:bg-zinc-900"
        >
          <option value="all">All</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      <div className="flex items-center gap-1.5">
        <span className="text-xs text-zinc-400">Dates</span>
        {DATE_PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => onChange({ ...filters, dateKey: p.key })}
            className={chip(filters.dateKey === p.key)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1.5">
        <span className="text-xs text-zinc-400" title="Probability band at entry">
          Play
        </span>
        {BANDS.map((b) => (
          <button
            key={b.key}
            type="button"
            onClick={() => toggleBand(b.key)}
            title={b.range}
            className={chip(filters.bands.includes(b.key))}
          >
            {b.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1.5">
        <span className="text-xs text-zinc-400">Side</span>
        {(["both", "yes", "no"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onChange({ ...filters, side: s })}
            className={chip(filters.side === s)}
          >
            {s === "both" ? "Both" : s === "yes" ? "Yes" : "No"}
          </button>
        ))}
      </div>
    </div>
  );
}

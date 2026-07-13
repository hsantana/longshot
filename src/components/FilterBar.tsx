"use client";

import {
  BANDS,
  DATE_PRESETS,
  type BandKey,
  type Filters,
} from "@/lib/analytics";
import { chipClass as chip } from "@/lib/ui";

interface Props {
  categories: string[];
  filters: Filters;
  onChange: (f: Filters) => void;
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-zinc-400">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

/** Vertical filter rail (sidebar on desktop, stacked block on mobile). */
export default function FilterBar({ categories, filters, onChange }: Props) {
  function toggleBand(key: BandKey) {
    const bands = filters.bands.includes(key)
      ? filters.bands.filter((b) => b !== key)
      : [...filters.bands, key];
    onChange({ ...filters, bands });
  }

  return (
    <div className="space-y-5 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <Group label="Status">
        {(["all", "open", "closed"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onChange({ ...filters, status: s })}
            className={chip(filters.status === s)}
          >
            {s === "all" ? "All" : s === "open" ? "Open" : "Closed"}
          </button>
        ))}
      </Group>

      <Group label="Dates">
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
      </Group>

      <Group label="Markets">
        <select
          value={filters.category}
          onChange={(e) => onChange({ ...filters, category: e.target.value })}
          className="w-full rounded-lg border border-zinc-200 bg-transparent px-2 py-1.5 text-xs font-medium text-zinc-700 outline-none dark:border-zinc-700 dark:text-zinc-200 dark:[&>option]:bg-zinc-900"
        >
          <option value="all">All</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </Group>

      <Group label="Side">
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
      </Group>

      <Group label="Type of play">
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
      </Group>
    </div>
  );
}

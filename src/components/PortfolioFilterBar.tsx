"use client";

import { BANDS, type BandKey } from "@/lib/analytics";
import { chipClass as chip } from "@/lib/ui";

export interface PortfolioFilters {
  category: string; // "all" or a category name
  result: "all" | "winning" | "losing";
  closing: "all" | "soon";
  bands: BandKey[]; // empty = all bands
}

export const DEFAULT_PORTFOLIO_FILTERS: PortfolioFilters = {
  category: "all",
  result: "all",
  closing: "all",
  bands: [],
};

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

export default function PortfolioFilterBar({
  categories,
  filters,
  onChange,
}: {
  categories: string[];
  filters: PortfolioFilters;
  onChange: (f: PortfolioFilters) => void;
}) {
  function toggleBand(key: BandKey) {
    const bands = filters.bands.includes(key)
      ? filters.bands.filter((b) => b !== key)
      : [...filters.bands, key];
    onChange({ ...filters, bands });
  }

  return (
    <div className="space-y-5 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
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

      <Group label="Result">
        {(["all", "winning", "losing"] as const).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => onChange({ ...filters, result: r })}
            className={chip(filters.result === r)}
          >
            {r === "all" ? "All" : r === "winning" ? "Winning" : "Losing"}
          </button>
        ))}
      </Group>

      <Group label="Closing">
        {(["all", "soon"] as const).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange({ ...filters, closing: c })}
            className={chip(filters.closing === c)}
          >
            {c === "all" ? "All" : "Closing soon"}
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

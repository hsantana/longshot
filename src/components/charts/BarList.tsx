"use client";

interface Item {
  /** Falls back to label; set when labels can repeat. */
  key?: string;
  label: string;
  sublabel?: string;
  /** Optional leading icon (e.g. a market's image), matching the table view. */
  icon?: string;
  value: number;
  display: string;
  extra?: string;
  /** Colour the bar independently of its magnitude (e.g. size by allocation,
   *  colour by whether the position is up or down). */
  tone?: "positive" | "negative" | "neutral";
  /** Draws a reference marker on the bar (bullet-chart style), e.g. cost basis
   *  against current value. */
  reference?: number;
  referenceLabel?: string;
}

interface Props {
  items: Item[];
  /** "magnitude": single hue. "diverging": green/red by sign. */
  mode?: "magnitude" | "diverging";
  /** Optional headers for the value and extra columns. */
  columns?: { value: string; extra?: string };
}

export default function BarList({ items, mode = "magnitude", columns }: Props) {
  if (items.length === 0) {
    return <p className="py-8 text-center text-sm text-zinc-400">No data in this window.</p>;
  }
  const max = Math.max(...items.map((i) => Math.abs(i.value)), 1e-9);
  return (
    <ul className="space-y-2.5">
      {columns && (
        <li className="flex items-center gap-3 text-[11px] font-medium uppercase tracking-wide text-zinc-400">
          <span className="w-40 shrink-0" />
          <span className="flex-1" />
          <span className="w-20 shrink-0 text-right">{columns.value}</span>
          {columns.extra !== undefined && (
            <span className="w-20 shrink-0 text-right">{columns.extra}</span>
          )}
        </li>
      )}
      {items.map((item) => {
        const frac = Math.abs(item.value) / max;
        const sign = item.tone ?? (mode === "diverging" ? (item.value >= 0 ? "positive" : "negative") : "neutral");
        const color =
          sign === "positive"
            ? "bg-emerald-500 dark:bg-emerald-500"
            : sign === "negative"
              ? "bg-rose-500 dark:bg-rose-500"
              : "bg-emerald-600 dark:bg-emerald-500";
        return (
          <li key={item.key ?? item.label} className="flex items-center gap-3 text-sm">
            <span className="flex w-40 shrink-0 items-center gap-2" title={item.label}>
              {item.icon && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.icon} alt="" className="h-6 w-6 shrink-0 rounded object-cover" />
              )}
              <span className="min-w-0 truncate text-zinc-600 dark:text-zinc-300">
                {item.label}
                {item.sublabel && (
                  <span className="block text-[11px] text-zinc-400">{item.sublabel}</span>
                )}
              </span>
            </span>
            <span className="relative h-4 min-w-[56px] flex-1 overflow-hidden rounded-sm bg-zinc-100 dark:bg-zinc-800">
              <span
                className={`absolute inset-y-0 left-0 rounded-sm ${color}`}
                style={{ width: `${Math.max(frac * 100, item.value !== 0 ? 1 : 0)}%` }}
              />
              {item.reference !== undefined && item.reference > 0 && (
                <span
                  aria-hidden="true"
                  title={item.referenceLabel}
                  className="absolute inset-y-0 w-0.5 bg-zinc-500 dark:bg-zinc-300"
                  style={{
                    left: `${Math.min((Math.abs(item.reference) / max) * 100, 100)}%`,
                  }}
                />
              )}
            </span>
            <span className="w-20 shrink-0 text-right font-medium tabular-nums">
              {item.display}
            </span>
            {item.extra !== undefined && (
              <span className="w-20 shrink-0 text-right text-xs tabular-nums text-zinc-400">
                {item.extra}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

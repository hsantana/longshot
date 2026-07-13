"use client";

interface Item {
  label: string;
  sublabel?: string;
  value: number;
  display: string;
  extra?: string;
}

interface Props {
  items: Item[];
  /** "magnitude": single hue. "diverging": green/red by sign. */
  mode?: "magnitude" | "diverging";
}

export default function BarList({ items, mode = "magnitude" }: Props) {
  if (items.length === 0) {
    return <p className="py-8 text-center text-sm text-zinc-400">No data in this window.</p>;
  }
  const max = Math.max(...items.map((i) => Math.abs(i.value)), 1e-9);
  return (
    <ul className="space-y-2.5">
      {items.map((item) => {
        const frac = Math.abs(item.value) / max;
        const color =
          mode === "diverging"
            ? item.value >= 0
              ? "bg-emerald-500 dark:bg-emerald-500"
              : "bg-rose-500 dark:bg-rose-500"
            : "bg-emerald-600 dark:bg-emerald-500";
        return (
          <li key={item.label} className="flex items-center gap-3 text-sm">
            <span className="w-28 shrink-0 truncate text-zinc-600 dark:text-zinc-300" title={item.label}>
              {item.label}
              {item.sublabel && (
                <span className="block text-[11px] text-zinc-400">{item.sublabel}</span>
              )}
            </span>
            <span className="relative h-4 flex-1 overflow-hidden rounded-sm bg-zinc-100 dark:bg-zinc-800">
              <span
                className={`absolute inset-y-0 left-0 rounded-sm ${color}`}
                style={{ width: `${Math.max(frac * 100, item.value !== 0 ? 1 : 0)}%` }}
              />
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

"use client";

export type CardView = "bar" | "table";

/** Bar-chart / table switch shown in a card header. */
export default function ViewToggle({
  view,
  onChange,
}: {
  view: CardView;
  onChange: (v: CardView) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      {(["bar", "table"] as const).map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          aria-label={v === "bar" ? "Bar chart" : "Table"}
          title={v === "bar" ? "Bar chart" : "Table"}
          className={`rounded-md p-1.5 transition ${
            view === v
              ? "bg-zinc-200 text-zinc-900 dark:bg-zinc-700 dark:text-zinc-100"
              : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          }`}
        >
          {v === "bar" ? (
            <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">
              <rect x="1" y="9" width="3.5" height="6" rx="1" />
              <rect x="6.25" y="5" width="3.5" height="10" rx="1" />
              <rect x="11.5" y="1" width="3.5" height="14" rx="1" />
            </svg>
          ) : (
            <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">
              <rect x="1" y="2" width="14" height="2.2" rx="1" />
              <rect x="1" y="7" width="14" height="2.2" rx="1" />
              <rect x="1" y="11.8" width="14" height="2.2" rx="1" />
            </svg>
          )}
        </button>
      ))}
    </div>
  );
}

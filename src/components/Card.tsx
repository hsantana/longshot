export default function Card({
  title,
  subtitle,
  action,
  className = "",
  children,
}: {
  title: string;
  subtitle?: string;
  /** Optional control rendered at the top-right, e.g. a view toggle. */
  action?: React.ReactNode;
  /** Extra classes on the card itself, e.g. grid placement. */
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 ${className}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-zinc-400">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

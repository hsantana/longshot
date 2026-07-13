// Shared UI class helpers. Keep filter/selection styling here so every filter
// across the app stays consistent.

/**
 * Pill/chip used for filter selectors. The active state is neutral (near-black
 * in light, near-white in dark) on purpose: filters are selections, not
 * outcomes, so a "good/green" color would wrongly imply a positive result.
 */
export function chipClass(active: boolean): string {
  return `rounded-full border px-3 py-1 text-xs font-medium transition ${
    active
      ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
      : "border-zinc-200 text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-zinc-200"
  }`;
}

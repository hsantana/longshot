"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const LAST_HANDLE_KEY = "longshot:lastHandle";

// Two organizing groups. Tracker items are scoped to a trader handle; Research
// items are absolute. The group labels are purely visual — they don't appear
// in URLs.
const GROUPS = [
  {
    label: "Tracker",
    items: [
      { segment: "", label: "Performance" },
      { segment: "portfolio", label: "Portfolio" },
      { segment: "style", label: "Style" },
    ],
  },
  {
    label: "Research",
    items: [{ href: "/discovery", label: "Discovery" }],
  },
] as const;

const linkClass = (active: boolean) =>
  `whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition lg:rounded-lg lg:border-b-0 lg:px-3 lg:py-2 ${
    active
      ? "border-zinc-900 text-zinc-900 lg:bg-zinc-200/70 dark:border-zinc-100 dark:text-zinc-100 dark:lg:bg-zinc-800"
      : "border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 lg:hover:bg-zinc-100 dark:lg:hover:bg-zinc-800/50"
  }`;

/**
 * Grouped section nav. `handle` is set on trader pages; elsewhere (Discovery)
 * Tracker links fall back to the last-viewed handle, or the landing page if
 * none has been visited yet.
 */
export default function SectionNav({ handle }: { handle?: string }) {
  const pathname = usePathname();
  const [savedHandle, setSavedHandle] = useState<string | null>(null);

  // Remember the current trader; recall it when there's no active handle.
  useEffect(() => {
    if (handle) {
      try {
        localStorage.setItem(LAST_HANDLE_KEY, handle);
      } catch {}
    } else {
      try {
        // One-time hydration of client-only state from localStorage on mount;
        // can't run during SSR without a hydration mismatch.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSavedHandle(localStorage.getItem(LAST_HANDLE_KEY));
      } catch {}
    }
  }, [handle]);

  const effectiveHandle = handle ?? savedHandle;
  const base = effectiveHandle ? `/t/${effectiveHandle}` : null;

  function trackerHref(segment: string) {
    if (!base) return "/";
    return segment ? `${base}/${segment}` : base;
  }

  function trackerActive(segment: string) {
    if (!handle) return false; // Tracker is never "active" off a trader page.
    const b = `/t/${handle}`;
    const href = segment ? `${b}/${segment}` : b;
    return segment === ""
      ? pathname === b || pathname === `${b}/`
      : pathname.startsWith(href);
  }

  return (
    <nav className="flex items-start gap-2 overflow-x-auto border-b border-zinc-200 pb-1 dark:border-zinc-800 lg:sticky lg:top-8 lg:flex-col lg:gap-4 lg:border-b-0 lg:pb-0">
      {GROUPS.map((group) => (
        <div
          key={group.label}
          className="flex items-center gap-1 lg:flex-col lg:items-stretch lg:gap-0.5"
        >
          <span className="whitespace-nowrap px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-300 dark:text-zinc-600 lg:py-1">
            {group.label}
          </span>
          {group.items.map((item) =>
            "href" in item ? (
              <Link
                key={item.label}
                href={item.href}
                className={linkClass(pathname.startsWith(item.href))}
              >
                {item.label}
              </Link>
            ) : (
              <Link
                key={item.label}
                href={trackerHref(item.segment)}
                className={linkClass(trackerActive(item.segment))}
              >
                {item.label}
              </Link>
            )
          )}
        </div>
      ))}
    </nav>
  );
}

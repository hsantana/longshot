"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { segment: "", label: "Performance" },
  { segment: "portfolio", label: "Portfolio" },
  { segment: "style", label: "Style" },
];

export default function TabNav({ handle }: { handle: string }) {
  const pathname = usePathname();
  const base = `/t/${handle}`;

  return (
    <nav className="flex items-center gap-1 overflow-x-auto border-b border-zinc-200 dark:border-zinc-800 lg:sticky lg:top-8 lg:flex-col lg:items-stretch lg:gap-1 lg:border-b-0">
      {TABS.map((tab) => {
        const href = tab.segment ? `${base}/${tab.segment}` : base;
        const active =
          tab.segment === ""
            ? pathname === base || pathname === `${base}/`
            : pathname.startsWith(href);
        return (
          <Link
            key={tab.label}
            href={href}
            className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition lg:rounded-lg lg:border-b-0 lg:px-3 lg:py-2 ${
              active
                ? "border-zinc-900 text-zinc-900 lg:bg-zinc-200/70 dark:border-zinc-100 dark:text-zinc-100 dark:lg:bg-zinc-800"
                : "border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 lg:hover:bg-zinc-100 dark:lg:hover:bg-zinc-800/50"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { segment: "", label: "Performance" },
  { segment: "style", label: "Style" },
  { segment: "portfolio", label: "Portfolio" },
];

export default function TabNav({ handle }: { handle: string }) {
  const pathname = usePathname();
  const base = `/t/${handle}`;

  return (
    <nav className="flex items-center gap-1 border-b border-zinc-200 dark:border-zinc-800">
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
            className={`border-b-2 px-4 py-2.5 text-sm font-medium transition ${
              active
                ? "border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100"
                : "border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

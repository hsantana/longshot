"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface Suggestion {
  name: string;
  proxyWallet: string;
  profileImage: string | null;
}

export default function SearchBox({
  autoFocus = false,
  compact = false,
}: {
  autoFocus?: boolean;
  compact?: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function onChange(value: string) {
    setQuery(value);
    setHighlighted(-1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = value.trim();
    if (q.length < 2 || /^0x[a-fA-F0-9]{6,}$/.test(q)) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const data = (await res.json()) as { profiles: Suggestion[] };
        setSuggestions(data.profiles);
        setOpen(data.profiles.length > 0);
      } catch {
        setSuggestions([]);
      }
    }, 250);
  }

  function go(handle: string) {
    const h = handle.trim();
    if (!h) return;
    setOpen(false);
    router.push(`/t/${encodeURIComponent(h)}`);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open && highlighted >= 0) go(suggestions[highlighted].name);
      else go(query);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <svg
          className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m21 21-4.35-4.35M17 11a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z"
          />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          autoFocus={autoFocus}
          placeholder="Polymarket username or 0x address"
          spellCheck={false}
          autoComplete="off"
          className={`w-full rounded-2xl border border-zinc-200 bg-white pl-12 pr-4 text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-600 dark:focus:ring-zinc-800/50 ${
            compact ? "h-11 text-sm" : "h-14 text-base"
          }`}
        />
      </div>
      {open && (
        <ul className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
          {suggestions.map((s, i) => (
            <li key={s.proxyWallet}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  go(s.name);
                }}
                onMouseEnter={() => setHighlighted(i)}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition ${
                  i === highlighted
                    ? "bg-zinc-100 dark:bg-zinc-800"
                    : "bg-transparent"
                }`}
              >
                {s.profileImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={s.profileImage}
                    alt=""
                    className="h-7 w-7 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-200 text-xs font-medium text-zinc-500 dark:bg-zinc-700 dark:text-zinc-300">
                    {s.name.slice(0, 1).toUpperCase()}
                  </span>
                )}
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {s.name}
                </span>
                <span className="ml-auto font-mono text-xs text-zinc-400">
                  {s.proxyWallet.slice(0, 6)}…{s.proxyWallet.slice(-4)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

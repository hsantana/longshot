import SearchBox from "@/components/SearchBox";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24">
      <div className="w-full max-w-xl text-center">
        <h1 className="text-5xl font-bold tracking-tight">
          Longshot
          <span className="text-emerald-500">.</span>
        </h1>
        <p className="mt-4 text-lg text-zinc-500 dark:text-zinc-400">
          Performance tracker for Polymarket traders. Look up any account&apos;s
          open positions, closed positions, and PnL.
        </p>
        <div className="mt-10">
          <SearchBox autoFocus />
        </div>
        <p className="mt-6 text-sm text-zinc-400 dark:text-zinc-500">
          Public on-chain data · No login required ·{" "}
          <a
            href="https://github.com/hsantana/longshot"
            className="underline decoration-zinc-300 underline-offset-4 transition hover:text-zinc-600 dark:decoration-zinc-600 dark:hover:text-zinc-300"
          >
            Open source
          </a>
        </p>
      </div>
    </main>
  );
}

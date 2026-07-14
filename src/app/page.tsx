import SearchBox from "@/components/SearchBox";
import Wordmark from "@/components/Wordmark";
import { BRAND } from "@/config/brand";

// Split the tagline so "Polymarket" can carry a subtle brand-blue gradient;
// falls back to the plain string if the word ever changes in brand.ts.
function Tagline({ text }: { text: string }) {
  const parts = text.split(/(Polymarket)/);
  return (
    <>
      {parts.map((part, i) =>
        part === "Polymarket" ? (
          <span
            key={i}
            className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text font-medium text-transparent"
          >
            {part}
          </span>
        ) : (
          part
        )
      )}
    </>
  );
}

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24">
      <div className="w-full max-w-xl text-center">
        <h1>
          <Wordmark className="mx-auto h-[120px]" />
        </h1>
        <p className="mt-4 text-lg text-zinc-500 dark:text-zinc-400">
          <Tagline text={BRAND.tagline} />
        </p>
        <div className="mt-10">
          <SearchBox autoFocus />
        </div>
      </div>
    </main>
  );
}

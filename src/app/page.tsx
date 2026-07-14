import SearchBox from "@/components/SearchBox";
import Wordmark from "@/components/Wordmark";
import { BRAND } from "@/config/brand";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24">
      <div className="w-full max-w-xl text-center">
        <h1>
          <Wordmark className="mx-auto h-[120px]" />
        </h1>
        <p className="mt-4 text-lg text-zinc-500 dark:text-zinc-400">
          {BRAND.tagline}
        </p>
        <div className="mt-10">
          <SearchBox autoFocus />
        </div>
      </div>
    </main>
  );
}

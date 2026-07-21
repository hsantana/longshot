import Link from "next/link";
import SearchBox from "@/components/SearchBox";
import Wordmark from "@/components/Wordmark";
import ThemeToggle from "@/components/ThemeToggle";

/** Shared top header: wordmark + compact search + theme toggle. */
export default function AppHeader() {
  return (
    <header className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
      <Link href="/" className="shrink-0 sm:flex-1">
        <Wordmark className="h-[53px]" />
      </Link>
      <div className="w-full sm:max-w-md">
        <SearchBox compact />
      </div>
      <div className="hidden sm:block sm:flex-1" />
      <ThemeToggle className="absolute right-0 top-0" />
    </header>
  );
}

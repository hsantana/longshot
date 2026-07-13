import Link from "next/link";
import type { Metadata } from "next";
import SearchBox from "@/components/SearchBox";
import Wordmark from "@/components/Wordmark";
import TabNav from "@/components/TabNav";
import { getAccount } from "@/lib/polymarket";
import { shortAddress } from "@/lib/format";
import { BRAND } from "@/config/brand";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  return { title: `${decodeURIComponent(handle)} · ${BRAND.name}` };
}

export default async function TrackerLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const decoded = decodeURIComponent(handle);

  let account: Awaited<ReturnType<typeof getAccount>> = null;
  let apiError = false;
  try {
    account = await getAccount(decoded);
  } catch {
    apiError = true;
  }

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Link href="/" className="text-xl text-zinc-900 dark:text-zinc-100">
          <Wordmark />
        </Link>
        <div className="w-full sm:max-w-md">
          <SearchBox compact />
        </div>
      </header>

      {!account ? (
        <div className="mt-24 text-center">
          <p className="text-lg font-medium">
            {apiError ? "Something went wrong" : `No account found for “${decoded}”`}
          </p>
          <p className="mt-2 text-sm text-zinc-400">
            {apiError
              ? "Polymarket's API didn't respond. It may be rate-limiting — try again in a moment."
              : "Try a Polymarket username or a full 0x wallet address."}
          </p>
        </div>
      ) : (
        <>
          <section className="mt-8 flex items-center gap-4">
            {account.summary.profileImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={account.summary.profileImage}
                alt=""
                className="h-14 w-14 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-200 text-xl font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300">
                {(account.summary.name ?? account.summary.address)
                  .replace(/^0x/, "")
                  .slice(0, 1)
                  .toUpperCase()}
              </span>
            )}
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {account.summary.name ?? shortAddress(account.summary.address)}
              </h1>
              <a
                href={`https://polymarket.com/profile/${account.summary.address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs text-zinc-400 hover:underline"
              >
                {account.summary.address}
              </a>
            </div>
          </section>

          <div className="mt-6">
            <TabNav handle={handle} />
          </div>

          <div className="mt-6">{children}</div>
        </>
      )}
    </main>
  );
}

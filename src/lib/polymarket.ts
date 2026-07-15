// Thin client over Polymarket's public read-only APIs.
// No API key required. Endpoint shapes verified 2026-07.

import { cache } from "react";

const DATA_API = "https://data-api.polymarket.com";
const GAMMA_API = "https://gamma-api.polymarket.com";
const LB_API = "https://lb-api.polymarket.com";

export interface Profile {
  name: string;
  pseudonym: string;
  proxyWallet: string;
  profileImage?: string;
  displayUsernamePublic?: boolean;
}

export interface OpenPosition {
  proxyWallet: string;
  asset: string;
  conditionId: string;
  size: number;
  avgPrice: number;
  initialValue: number;
  currentValue: number;
  cashPnl: number;
  percentPnl: number;
  totalBought: number;
  realizedPnl: number;
  curPrice: number;
  redeemable: boolean;
  title: string;
  slug: string;
  icon: string;
  eventSlug: string;
  outcome: string;
  outcomeIndex: number;
  endDate: string;
}

export interface ClosedPosition {
  proxyWallet: string;
  asset: string;
  conditionId: string;
  avgPrice: number;
  totalBought: number;
  realizedPnl: number;
  curPrice: number;
  title: string;
  slug: string;
  icon: string;
  eventSlug: string;
  outcome: string;
  outcomeIndex: number;
  endDate: string;
  timestamp: number;
  /** Market resolved but tokens not yet redeemed; true when there's value left to claim. */
  claimable?: boolean;
}

export interface AccountSummary {
  address: string;
  name: string | null;
  profileImage: string | null;
  portfolioValue: number;
  realizedPnl: number | null;
  unrealizedPnl: number;
}

export interface Trade {
  side: "BUY" | "SELL";
  usdcSize: number;
  size: number;
  price: number;
  timestamp: number;
  conditionId: string;
  asset: string;
  outcomeIndex: number;
  outcome: string;
  title: string;
  eventSlug: string;
}

/** Any activity row (trade, redemption, yield, deposit, ...); see ActivityType. */
export type ActivityType =
  | "TRADE"
  | "SPLIT"
  | "MERGE"
  | "REDEEM"
  | "REWARD"
  | "CONVERSION"
  | "DEPOSIT"
  | "WITHDRAWAL"
  | "YIELD"
  | "MAKER_REBATE"
  | "TAKER_REBATE"
  | "REFERRAL_REWARD";

export interface Activity {
  type: ActivityType;
  side: "BUY" | "SELL" | "";
  usdcSize: number;
  size: number;
  price: number;
  timestamp: number;
  conditionId: string;
  asset: string;
  outcomeIndex: number;
}

export function isAddress(s: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(s.trim());
}

async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Polymarket API ${res.status} for ${url}`);
  }
  return res.json() as Promise<T>;
}

export async function searchProfiles(query: string): Promise<Profile[]> {
  const url = `${GAMMA_API}/public-search?q=${encodeURIComponent(query)}&search_profiles=true`;
  const data = await getJSON<{ profiles?: Profile[] }>(url);
  return data.profiles ?? [];
}

/** Resolve a username or 0x address to a wallet address (plus display name when known). */
export async function resolveHandle(
  handle: string
): Promise<{ address: string; name: string | null } | null> {
  const q = handle.trim();
  if (isAddress(q)) return { address: q.toLowerCase(), name: null };
  const profiles = await searchProfiles(q);
  if (profiles.length === 0) return null;
  const exact = profiles.find(
    (p) => p.name.toLowerCase() === q.toLowerCase()
  );
  const match = exact ?? profiles[0];
  return { address: match.proxyWallet.toLowerCase(), name: match.name };
}

export async function getOpenPositions(address: string): Promise<OpenPosition[]> {
  const url = `${DATA_API}/positions?user=${address}&limit=500&sortBy=CURRENT&sortDirection=DESC`;
  return getJSON<OpenPosition[]>(url);
}

// The endpoint caps at 50 rows per page; fetch up to `cap` in parallel pages.
export async function getClosedPositions(
  address: string,
  cap = 500
): Promise<ClosedPosition[]> {
  const pageSize = 50;
  const offsets = Array.from(
    { length: Math.ceil(cap / pageSize) },
    (_, i) => i * pageSize
  );
  const pages = await Promise.all(
    offsets.map((offset) =>
      getJSON<ClosedPosition[]>(
        `${DATA_API}/closed-positions?user=${address}&limit=${pageSize}&offset=${offset}&sortBy=TIMESTAMP&sortDirection=DESC`
      ).catch(() => [] as ClosedPosition[])
    )
  );
  return pages.flat();
}

/** Trade history (most recent first), paged up to `cap` trades. */
export async function getTrades(address: string, cap = 3000): Promise<Trade[]> {
  const pageSize = 500;
  const trades: Trade[] = [];
  for (let offset = 0; offset < cap; offset += pageSize) {
    const page = await getJSON<Trade[]>(
      `${DATA_API}/activity?user=${address}&type=TRADE&limit=${pageSize}&offset=${offset}&sortBy=TIMESTAMP&sortDirection=DESC`
    ).catch(() => [] as Trade[]);
    trades.push(...page);
    if (page.length < pageSize) break;
  }
  return trades;
}

/** Every activity row (trades, redemptions, yield, deposits, ...), most recent first. */
export async function getFullActivity(address: string, cap = 5000): Promise<Activity[]> {
  const pageSize = 500;
  const rows: Activity[] = [];
  for (let offset = 0; offset < cap; offset += pageSize) {
    const page = await getJSON<Activity[]>(
      `${DATA_API}/activity?user=${address}&limit=${pageSize}&offset=${offset}&sortBy=TIMESTAMP&sortDirection=DESC`
    ).catch(() => [] as Activity[]);
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  return rows;
}

const CLOB_API = "https://clob.polymarket.com";

/** Daily price history (0..1) for a CLOB token id, oldest first. */
export async function getPriceHistory(
  assetId: string
): Promise<{ t: number; p: number }[]> {
  const data = await getJSON<{ history: { t: number; p: number }[] }>(
    `${CLOB_API}/prices-history?market=${assetId}&interval=max&fidelity=1440`
  ).catch(() => ({ history: [] }));
  return data.history;
}

const USDC_CONTRACTS = [
  "0xC011a7E12a19f7B1f670d46F03B03f3342E82DFB", // pUSD — Polymarket's current collateral token, 1:1 USDC-backed
  "0x2791bca1f2de4661ed88a30c99a7a9449aa84174", // USDC.e — legacy collateral, pre-pUSD migration
  "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359", // native USDC — included in case of stray balances
];

// Public RPC endpoints, tried in order. polygon-rpc.com now rejects anonymous
// requests (401, "tenant disabled"), so it isn't listed; keep several
// alternatives since any single free provider can go down or start requiring
// a key at any time.
const POLYGON_RPCS = [
  "https://polygon.drpc.org",
  "https://1rpc.io/matic",
  "https://polygon-bor-rpc.publicnode.com",
];

async function ethCallBalanceOf(
  rpc: string,
  contract: string,
  address: string
): Promise<number> {
  const res = await fetch(rpc, {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_call",
      params: [
        { to: contract, data: `0x70a08231${address.slice(2).padStart(64, "0")}` },
        "latest",
      ],
    }),
  });
  const data = (await res.json()) as { result?: string; error?: unknown };
  // A real RPC error (missing/invalid result) must not be read as a zero
  // balance — throw so the caller can fall back to the next endpoint.
  if (!res.ok || !data.result) {
    throw new Error(`RPC ${rpc} failed: ${res.status} ${JSON.stringify(data.error ?? data)}`);
  }
  return parseInt(data.result, 16) / 1e6;
}

async function balanceOfWithFallback(contract: string, address: string): Promise<number> {
  let lastError: unknown;
  for (const rpc of POLYGON_RPCS) {
    try {
      return await ethCallBalanceOf(rpc, contract, address);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

/** Wallet USDC balance ("Cash") read from the Polygon chain. Null when every RPC fails. */
export async function getUsdcBalance(address: string): Promise<number | null> {
  try {
    const balances = await Promise.all(
      USDC_CONTRACTS.map((contract) => balanceOfWithFallback(contract, address))
    );
    return balances.reduce((a, b) => a + b, 0);
  } catch {
    return null;
  }
}

// Polymarket models "category" as event tags; match against the site's
// top-level categories, first hit wins.
const CANONICAL_CATEGORIES = [
  "Politics",
  "Elections",
  "Geopolitics",
  "Sports",
  "Esports",
  "Crypto",
  "Finance",
  "Business",
  "Economy",
  "Earnings",
  "Tech",
  "Science",
  "AI",
  "Culture",
  "Pop Culture",
  "Entertainment",
  "Music",
  "Movies",
  "Weather",
  "World",
  "Health",
];

// Per-isolate cache: event slug -> category. Event tags are effectively
// immutable, so entries never need invalidating.
const categoryCache = new Map<string, string>();

/**
 * Resolve event slugs to a top-level category via the Gamma events endpoint.
 * Bounded: at most `maxSlugs` uncached slugs are fetched (chunks of 20);
 * anything beyond that maps to "Other".
 */
export async function getCategories(
  eventSlugs: string[],
  maxSlugs = 60
): Promise<Map<string, string>> {
  const unique = [...new Set(eventSlugs)];
  const missing = unique.filter((s) => !categoryCache.has(s)).slice(0, maxSlugs);

  const chunks: string[][] = [];
  for (let i = 0; i < missing.length; i += 20) chunks.push(missing.slice(i, i + 20));

  await Promise.all(
    chunks.map(async (chunk) => {
      const qs = chunk.map((s) => `slug=${encodeURIComponent(s)}`).join("&");
      try {
        const events = await getJSON<
          { slug: string; tags?: { label: string }[] }[]
        >(`${GAMMA_API}/events?${qs}`);
        for (const ev of events) {
          const labels = (ev.tags ?? []).map((t) => t.label);
          const match = CANONICAL_CATEGORIES.find((c) => labels.includes(c));
          categoryCache.set(ev.slug, match ?? "Other");
        }
      } catch {
        // leave uncached; they'll fall through to "Other" below
      }
    })
  );

  const result = new Map<string, string>();
  for (const slug of unique) {
    result.set(slug, categoryCache.get(slug) ?? "Other");
  }
  return result;
}

export async function getPortfolioValue(address: string): Promise<number> {
  const url = `${DATA_API}/value?user=${address}`;
  const data = await getJSON<{ user: string; value: number }[]>(url);
  return data[0]?.value ?? 0;
}

/** All-time profit from the leaderboard API; also returns display name + avatar for the address. */
export async function getProfitProfile(
  address: string
): Promise<{ amount: number; name: string; profileImage: string } | null> {
  const url = `${LB_API}/profit?window=all&limit=1&address=${address}`;
  const data = await getJSON<
    { proxyWallet: string; amount: number; name: string; profileImage: string }[]
  >(url);
  return data[0] ?? null;
}

async function getAccountUncached(handle: string): Promise<
  | {
      summary: AccountSummary;
      openPositions: OpenPosition[];
      closedPositions: ClosedPosition[];
    }
  | null
> {
  const resolved = await cachedResolveHandle(handle);
  if (!resolved) return null;
  const { address } = resolved;

  const [rawOpenPositions, rawClosedPositions, portfolioValue, profit] =
    await Promise.all([
      getOpenPositions(address),
      getClosedPositions(address),
      getPortfolioValue(address),
      getProfitProfile(address),
    ]);

  // The Data API keeps a position in /positions until its tokens are sold or
  // redeemed — including markets that already resolved (redeemable: true),
  // e.g. an eliminated team in a still-running negative-risk event. Those
  // outcomes are final, so present them as closed.
  const openPositions = rawOpenPositions.filter((p) => !p.redeemable);
  const resolvedAsClosed: ClosedPosition[] = rawOpenPositions
    .filter((p) => p.redeemable)
    .map((p) => ({
      proxyWallet: p.proxyWallet,
      asset: p.asset,
      conditionId: p.conditionId,
      avgPrice: p.avgPrice,
      totalBought: p.totalBought,
      realizedPnl: p.realizedPnl + p.cashPnl,
      curPrice: p.curPrice,
      title: p.title,
      slug: p.slug,
      icon: p.icon,
      eventSlug: p.eventSlug,
      outcome: p.outcome,
      outcomeIndex: p.outcomeIndex,
      endDate: p.endDate,
      // The API doesn't say when the market resolved; the event's endDate can
      // even be in the future (early resolution inside a negative-risk event),
      // so cap at now to keep these out of the future on charts.
      timestamp: Math.min(
        Math.floor(Date.parse(p.endDate) / 1000) || 0,
        Math.floor(Date.now() / 1000)
      ),
      claimable: p.currentValue > 0,
    }));

  const closedPositions = [...resolvedAsClosed, ...rawClosedPositions].sort(
    (a, b) => b.timestamp - a.timestamp
  );

  const unrealizedPnl = openPositions.reduce((sum, p) => sum + p.cashPnl, 0);

  return {
    summary: {
      address,
      name: resolved.name ?? (profit?.name || null),
      profileImage: profit?.profileImage || null,
      portfolioValue,
      realizedPnl: profit ? profit.amount : null,
      unrealizedPnl,
    },
    openPositions,
    closedPositions,
  };
}

// React request-level cache: layout and page(s) in the same request share one
// fetch of the underlying data.
export const cachedResolveHandle = cache(resolveHandle);
export const getAccount = cache(getAccountUncached);
export const cachedGetTrades = cache(getTrades);
export const cachedGetUsdcBalance = cache(getUsdcBalance);
export const cachedGetFullActivity = cache(getFullActivity);

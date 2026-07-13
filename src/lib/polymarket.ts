// Thin client over Polymarket's public read-only APIs.
// No API key required. Endpoint shapes verified 2026-07.

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

export async function getClosedPositions(address: string): Promise<ClosedPosition[]> {
  const url = `${DATA_API}/closed-positions?user=${address}&limit=100&sortBy=TIMESTAMP&sortDirection=DESC`;
  return getJSON<ClosedPosition[]>(url);
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

export async function getAccount(handle: string): Promise<
  | {
      summary: AccountSummary;
      openPositions: OpenPosition[];
      closedPositions: ClosedPosition[];
    }
  | null
> {
  const resolved = await resolveHandle(handle);
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
      timestamp: Math.floor(Date.parse(p.endDate) / 1000) || 0,
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

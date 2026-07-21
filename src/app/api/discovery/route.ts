import { NextRequest, NextResponse } from "next/server";
import { getDiscoveryMarkets } from "@/lib/polymarket";
import { DATE_RANGES, type RangeKey } from "@/lib/discovery";

const VALID = new Set<string>(DATE_RANGES.map((r) => r.key));

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("range") ?? "week";
  const range: RangeKey = (VALID.has(raw) ? raw : "week") as RangeKey;

  try {
    const markets = await getDiscoveryMarkets(range);
    return NextResponse.json(
      { markets, refreshedAt: Date.now() },
      // Short edge cache so the 60s client polling doesn't hammer Polymarket;
      // stale-while-revalidate keeps responses instant.
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
        },
      }
    );
  } catch {
    return NextResponse.json(
      { markets: [], refreshedAt: Date.now() },
      { status: 502 }
    );
  }
}

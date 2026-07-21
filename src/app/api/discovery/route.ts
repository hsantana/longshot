import { NextRequest, NextResponse } from "next/server";
import { getDiscoveryMarkets } from "@/lib/polymarket";
import { CATEGORY_TAG_ID } from "@/lib/categories";
import { DATE_RANGES, type RangeKey } from "@/lib/discovery";

const VALID = new Set<string>(DATE_RANGES.map((r) => r.key));

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("range") ?? "week";
  const range: RangeKey = (VALID.has(raw) ? raw : "week") as RangeKey;

  // `cats` is a comma-separated list of canonical category labels; present only
  // when the client has narrowed from "all". Map to Gamma tag ids (deduped).
  const catsParam = req.nextUrl.searchParams.get("cats");
  const tagIds = catsParam
    ? [
        ...new Set(
          catsParam
            .split(",")
            .map((c) => CATEGORY_TAG_ID[c.trim()])
            .filter((id): id is number => typeof id === "number")
        ),
      ]
    : [];

  try {
    const markets = await getDiscoveryMarkets(range, tagIds);
    return NextResponse.json(
      { markets, refreshedAt: Date.now() },
      // Short edge cache so polling doesn't hammer Polymarket; stale-while-
      // revalidate keeps responses instant.
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

import { NextRequest, NextResponse } from "next/server";
import { searchProfiles } from "@/lib/polymarket";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ profiles: [] });
  }
  try {
    const profiles = await searchProfiles(q);
    return NextResponse.json(
      {
        profiles: profiles.slice(0, 6).map((p) => ({
          name: p.name,
          proxyWallet: p.proxyWallet,
          profileImage: p.profileImage ?? null,
        })),
      },
      { headers: { "Cache-Control": "public, s-maxage=300" } }
    );
  } catch {
    return NextResponse.json({ profiles: [] }, { status: 502 });
  }
}

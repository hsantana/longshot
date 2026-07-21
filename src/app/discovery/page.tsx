import type { Metadata } from "next";
import AppHeader from "@/components/AppHeader";
import SectionNav from "@/components/SectionNav";
import DiscoveryView from "@/components/DiscoveryView";
import { BRAND } from "@/config/brand";

export const metadata: Metadata = {
  title: `Discovery · ${BRAND.name}`,
  description:
    "Screen Polymarket outcomes ranked by return per day of waiting. No login required.",
};

export default function DiscoveryPage() {
  return (
    <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-8">
      <AppHeader />
      <div className="mt-8 lg:grid lg:grid-cols-[150px_minmax(0,1fr)] lg:items-start lg:gap-8">
        <SectionNav />
        <div className="mt-6 lg:mt-0">
          <DiscoveryView />
        </div>
      </div>
    </main>
  );
}

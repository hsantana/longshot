import PerformanceView from "@/components/PerformanceView";
import { getDashboard } from "@/lib/dashboard";

export const dynamic = "force-dynamic";

export default async function PerformancePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  let dashboard: Awaited<ReturnType<typeof getDashboard>> = null;
  try {
    dashboard = await getDashboard(decodeURIComponent(handle));
  } catch {
    dashboard = null;
  }
  if (!dashboard) return null; // layout renders the error state

  return (
    <PerformanceView
      plays={dashboard.plays}
      positionPlays={dashboard.positionPlays}
      trades={dashboard.trades}
      categories={dashboard.categories}
      truncated={dashboard.truncated}
      tradesTruncated={dashboard.tradesTruncated}
    />
  );
}

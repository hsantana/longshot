import StyleView from "@/components/StyleView";
import { getDashboard } from "@/lib/dashboard";

export const dynamic = "force-dynamic";

export default async function StylePage({
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

  return <StyleView plays={dashboard.plays} categories={dashboard.categories} />;
}

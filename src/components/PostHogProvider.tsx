"use client";

// Wraps the app so components can use `usePostHog()`, and captures a
// $pageview on every App Router navigation (soft navs don't fire one on
// their own). When no PostHog key is configured this renders children
// untouched, keeping key-less checkouts a clean no-op.
import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";

const enabled = Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY);

function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname) return;
    let url = window.origin + pathname;
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
    posthog.capture("$pageview", { $current_url: url });
  }, [pathname, searchParams]);

  return null;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  if (!enabled) return <>{children}</>;

  return (
    <PHProvider client={posthog}>
      {/* useSearchParams requires a Suspense boundary. */}
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      {children}
    </PHProvider>
  );
}

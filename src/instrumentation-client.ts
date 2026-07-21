// PostHog client-side init. Runs once on client startup (Next.js
// instrumentation-client convention). No-ops when the key is absent, so
// forks and local checkouts without a PostHog project stay silent.
import posthog from "posthog-js";

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;

if (key) {
  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com",
    // Pageviews are captured manually in PostHogProvider so App Router
    // soft navigations are tracked correctly.
    capture_pageview: false,
    capture_pageleave: true,
    person_profiles: "always",
  });
}

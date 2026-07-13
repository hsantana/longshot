// Central brand configuration.
//
// The "Longshot" name and wordmark are trademarks excluded from this
// repository's MIT License (see TRADEMARKS.md). Forks: rebrand by editing
// this file and replacing any assets under /brand.

export const BRAND = {
  /** Product name, used in titles and headers. */
  name: "Longshot",
  /** Accent character appended to the name in the wordmark. */
  wordmarkAccent: ".",
  /** Short description used in page metadata and the home page. */
  tagline:
    "Performance tracker for Polymarket traders. Look up any account's open positions, closed positions, and PnL.",
  /** Source repository shown in the footer/home page. */
  repoUrl: "https://github.com/hsantana/longshot",
} as const;

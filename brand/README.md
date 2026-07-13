# Brand assets

This directory holds the Longshot brand assets (logo, wordmark, and related
artwork):

- `longshot-wordmark.png` — the cursive "longshot" wordmark used in the header
  and home page.
- `longshot-icon-512.png` — the app icon (rounded square mark), used for the
  favicon at large sizes and the Apple touch icon.
- `longshot-favicon-32.png`, `longshot-favicon-16.png` — small favicons.

These are imported directly by the app (`src/app/layout.tsx`,
`src/components/Wordmark.tsx`), so they are bundled and served from here — the
canonical copies live only in this folder.

**These assets are excluded from the repository's MIT License.** They are
brand identifiers owned by Hugo Santana and may not be used to brand forks,
modified versions, or derived products or services. See
[TRADEMARKS.md](../TRADEMARKS.md) for the full policy, including the factual
uses that are always permitted.

Forks: replace these assets and the values in `src/config/brand.ts` with your
own branding.

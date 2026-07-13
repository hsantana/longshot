# Longshot

Open-source performance tracker for [Polymarket](https://polymarket.com) traders.

Enter any Polymarket username or wallet address and see that account's open positions, closed positions, and PnL (realized, unrealized, and per-position). All data is public and read-only — no login, no wallet connection, no API keys.

## How it works

Longshot is a Next.js app whose server routes call Polymarket's public APIs:

- **Gamma API** (`gamma-api.polymarket.com`) — profile search (username → wallet address)
- **Data API** (`data-api.polymarket.com`) — open positions (`/positions`), closed positions (`/closed-positions`), portfolio value (`/value`)
- **Leaderboard API** (`lb-api.polymarket.com`) — all-time realized profit (`/profit`)

Requests go through the app's own server (not the browser) so lookups are shielded from CORS changes and can be cached at the edge.

## Running locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. No environment variables or secrets are required.

## Self-hosting

The app deploys anywhere Next.js runs. The included config targets Cloudflare Workers via [OpenNext](https://opennext.js.org/cloudflare):

```bash
npm run deploy    # builds with opennextjs-cloudflare and deploys with wrangler
```

You'll need a Cloudflare account and `wrangler` authenticated (`npx wrangler login`, or `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` in the environment). Adjust `wrangler.jsonc` to change the worker name or attach a custom domain.

## Roadmap

v1 is deliberately narrow: the tracker only. Planned for later phases, roughly in order:

- Calendar view of results
- Filters by market category, win-probability band, and time-to-resolution
- Strategy/scout screener
- Per-market chart view
- Kalshi support

## Contributing

Not accepting external contributions yet — see [CONTRIBUTING.md](CONTRIBUTING.md).
When contributions open, they are accepted under the same MIT License
("inbound = outbound").

## License and branding

The source code is licensed under the [MIT License](LICENSE). The project
name, logo, wordmark, and other brand assets are **not** included in that
license — see [TRADEMARKS.md](TRADEMARKS.md) and [brand/README.md](brand/README.md).
Forks and modified versions must use distinct branding and must not imply
endorsement or official affiliation.

To make rebranding easy, the name and wordmark are centralized in
[`src/config/brand.ts`](src/config/brand.ts) — forks change that file (and
replace anything under `brand/`) rather than hunting through the code.

Copyright (c) 2026 Hugo Santana.

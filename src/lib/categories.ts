// Polymarket models "category" as event tags. These are the site's top-level
// categories; tag matching picks the first hit. Kept in its own module so both
// the API layer and the Discovery screener can import it without a cycle.
export const CANONICAL_CATEGORIES = [
  "Politics",
  "Elections",
  "Geopolitics",
  "Sports",
  "Esports",
  "Crypto",
  "Finance",
  "Business",
  "Economy",
  "Earnings",
  "Tech",
  "Science",
  "AI",
  "Culture",
  "Pop Culture",
  "Entertainment",
  "Music",
  "Movies",
  "Weather",
  "World",
  "Health",
] as const;

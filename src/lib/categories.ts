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

/**
 * Polymarket tag ids per canonical category, for scoping the Discovery fetch
 * server-side (`tag_id` on Gamma's /markets). Tags overlap (e.g. Sports also
 * returns esports), so this only biases the fetched batch — the client-side
 * category filter still labels rows precisely. "Culture" and "Pop Culture" are
 * the same Polymarket tag (596).
 */
export const CATEGORY_TAG_ID: Record<string, number> = {
  Politics: 2,
  Elections: 144,
  Geopolitics: 100265,
  Sports: 1,
  Esports: 64,
  Crypto: 21,
  Finance: 120,
  Business: 107,
  Economy: 100328,
  Earnings: 1013,
  Tech: 1401,
  Science: 74,
  AI: 439,
  Culture: 596,
  "Pop Culture": 596,
  Entertainment: 315,
  Music: 100,
  Movies: 53,
  Weather: 84,
  World: 101970,
  Health: 414,
};

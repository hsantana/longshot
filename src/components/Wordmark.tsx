import wordmark from "../../brand/longshot-wordmark.png";

// The wordmark is a brand asset (see brand/README.md), not part of the MIT
// license. It's a black cursive mark on transparent, inverted to near-white in
// dark mode. Forks: swap the import above and the brand config.
export default function Wordmark({ className = "h-8" }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={wordmark.src}
      alt="longshot"
      className={`w-auto dark:invert ${className}`}
    />
  );
}

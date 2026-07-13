const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const usdCompact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

const num = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

export function formatUsd(value: number, compact = false): string {
  if (compact && Math.abs(value) >= 100_000) return usdCompact.format(value);
  return usd.format(value);
}

export function formatSignedUsd(value: number, compact = false): string {
  const formatted = formatUsd(Math.abs(value), compact);
  return value < 0 ? `-${formatted}` : `+${formatted}`;
}

export function formatShares(value: number): string {
  return num.format(value);
}

export function formatCents(price: number): string {
  return `${(price * 100).toFixed(1)}¢`;
}

export function formatPercent(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

export function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function formatDate(input: string | number): string {
  const date =
    typeof input === "number" ? new Date(input * 1000) : new Date(input);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function pnlColor(value: number): string {
  if (value > 0) return "text-emerald-500";
  if (value < 0) return "text-rose-500";
  return "text-zinc-400";
}

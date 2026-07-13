import { BRAND } from "@/config/brand";

export default function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-bold tracking-tight ${className}`}>
      {BRAND.name}
      <span className="text-emerald-500">{BRAND.wordmarkAccent}</span>
    </span>
  );
}

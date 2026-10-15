import { cn } from "@/lib/cn";

/**
 * How full a shelf is, measured against twice its low-stock threshold (the level a reorder
 * refills to): black when fine, amber when running low, a red track when out.
 */
export function StockBar({ stock, threshold }: { stock: number; threshold: number }) {
  const full = Math.max(threshold * 2, 1);
  const percent = Math.min(100, Math.round((stock / full) * 100));
  const out = stock <= 0;
  const low = !out && stock <= threshold;
  return (
    <span
      aria-hidden
      className={cn(
        "block h-1.5 overflow-hidden rounded-full",
        out ? "bg-danger/25" : "bg-surface-pressed",
      )}
    >
      <span
        className={cn("block h-full rounded-full", low ? "bg-warning" : "bg-ink")}
        style={{ width: `${percent}%` }}
      />
    </span>
  );
}

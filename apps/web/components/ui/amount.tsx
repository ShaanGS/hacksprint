import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/money";

// Sizes are a prop, not class overrides: cn() joins classes without merging them, so a
// text-2xl passed in would lose to a built-in text-lg.
const sizes = {
  sm: "text-sm font-medium",
  md: "text-base font-medium",
  lg: "text-lg font-semibold",
  xl: "text-2xl font-bold tracking-tight",
  hero: "text-hero font-extrabold tracking-tight",
} as const;

export type AmountSize = keyof typeof sizes;

/**
 * Money on screen. `paise` comes from the database or a server-computed total, never from the
 * model. `struck` shows a price it replaces, small, grey and crossed out.
 */
export function Amount({
  paise,
  size = "lg",
  struck,
  className,
}: {
  paise: number;
  size?: AmountSize;
  struck?: boolean;
  /** Colour and spacing only; the size comes from `size`. */
  className?: string;
}) {
  return (
    <span
      className={cn(
        "whitespace-nowrap tabular-nums",
        struck ? "text-sm text-ink-muted line-through" : sizes[size],
        className,
      )}
    >
      {formatMoney(paise)}
    </span>
  );
}

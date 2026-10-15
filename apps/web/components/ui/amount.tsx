import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/money";

/**
 * Money on screen. `paise` comes from the database or a server-computed total, never from the
 * model. `struck` shows a price it replaces, small, grey and crossed out.
 */
export function Amount({
  paise,
  struck,
  className,
}: {
  paise: number;
  struck?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "tabular-nums",
        struck ? "text-sm text-ink-muted line-through" : "text-lg font-medium",
        className,
      )}
    >
      {formatMoney(paise)}
    </span>
  );
}

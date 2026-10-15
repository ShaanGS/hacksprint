import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

/** A pill that is on or off, for filters and short choices. */
export function Chip({ on, className, ...props }: ComponentProps<"button"> & { on: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      className={cn(
        "min-h-10 shrink-0 rounded-full px-4 text-sm font-medium transition-colors",
        on ? "bg-accent text-accent-ink" : "bg-surface-muted text-ink",
        className,
      )}
      {...props}
    />
  );
}

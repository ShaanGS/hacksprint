import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

const tones = {
  light: { on: "bg-accent text-accent-ink", off: "bg-surface text-ink shadow-card" },
  night: { on: "bg-indigo text-night-ink", off: "bg-night-raised text-night-muted" },
} as const;

/** A pill that is on or off, for filters and short choices. */
export function Chip({
  on,
  tone = "light",
  className,
  ...props
}: ComponentProps<"button"> & { on: boolean; tone?: keyof typeof tones }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      className={cn(
        "min-h-11 shrink-0 rounded-full px-4 text-sm font-semibold transition-colors",
        on ? tones[tone].on : tones[tone].off,
        className,
      )}
      {...props}
    />
  );
}

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type BadgeTone = "neutral" | "best" | "success" | "danger";

const tones: Record<BadgeTone, string> = {
  neutral: "bg-surface-pressed text-ink-muted",
  best: "bg-accent text-accent-ink",
  success: "bg-success/15 text-success",
  danger: "bg-danger/15 text-danger",
};

/** A small tag. At most one per row: a status beats a sentence in colour. */
export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

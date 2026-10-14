import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

type CardTone = "base" | "raised" | "accent";

const tones: Record<CardTone, string> = {
  base: "bg-surface-muted",
  raised: "bg-surface-pressed",
  accent: "bg-accent text-accent-ink",
};

/** A grey rounded surface for summaries and nested strips. Lists stay flat rows, not cards. */
export function Card({
  className,
  tone = "base",
  ...props
}: ComponentProps<"div"> & { tone?: CardTone }) {
  return <div className={cn("rounded-2xl p-4", tones[tone], className)} {...props} />;
}

import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

type CardTone = "base" | "muted" | "accent" | "night";

const tones: Record<CardTone, string> = {
  base: "rounded-3xl bg-surface shadow-card",
  muted: "rounded-2xl bg-surface-muted",
  accent: "rounded-3xl bg-accent text-accent-ink",
  night: "rounded-3xl bg-night-raised text-night-ink",
};

/** A rounded surface: white cards sit on the white canvas with a soft shadow, muted ones inside. */
export function Card({
  className,
  tone = "base",
  ...props
}: ComponentProps<"div"> & { tone?: CardTone }) {
  return <div className={cn("p-4", tones[tone], className)} {...props} />;
}

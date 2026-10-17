import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

const tones = {
  mint: "bg-accent-soft text-accent",
  sand: "bg-tint-sand text-warning",
  sky: "bg-tint-sky text-indigo",
  lilac: "bg-tint-lilac text-indigo",
  lime: "bg-lime text-lime-ink",
} as const;

const sizes = {
  sm: { box: "size-11", icon: "size-5" },
  md: { box: "size-13", icon: "size-6" },
  lg: { box: "size-16", icon: "size-7" },
} as const;

export type IconTone = keyof typeof tones;

/** An idea (money, bills, customers) as a plain icon in a soft circle: quick to read at a glance. */
export function IconCircle({
  icon: Icon,
  tone = "mint",
  size = "md",
  className,
}: {
  icon: LucideIcon;
  tone?: IconTone;
  size?: keyof typeof sizes;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-full",
        tones[tone],
        sizes[size].box,
        className,
      )}
    >
      <Icon aria-hidden className={sizes[size].icon} strokeWidth={2.2} />
    </span>
  );
}

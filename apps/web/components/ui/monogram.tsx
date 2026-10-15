import { cn } from "@/lib/cn";

/** A customer's initials in a circle, so the owner recognises a regular at a glance. */
export function Monogram({ name, className }: { name: string; className?: string }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-11 shrink-0 place-items-center rounded-full bg-accent text-sm font-bold text-accent-ink",
        className,
      )}
    >
      {initials}
    </span>
  );
}

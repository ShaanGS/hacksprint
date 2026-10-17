import { cn } from "@/lib/cn";

/** A customer's initials in a circle, so the owner recognises a regular at a glance. */
export function Monogram({ name, muted }: { name: string; muted?: boolean }) {
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
        "grid size-12 shrink-0 place-items-center rounded-full text-sm font-bold",
        muted ? "bg-surface-muted text-ink-muted" : "bg-accent-soft text-accent",
      )}
    >
      {initials}
    </span>
  );
}

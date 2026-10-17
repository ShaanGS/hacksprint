import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

// Heights are a prop, not class overrides: cn() joins classes without merging them.
const heights = { sm: "min-h-32", md: "min-h-36", lg: "min-h-40" } as const;

/**
 * A white tile on the canvas with an icon or a product photo in the top right corner; the words
 * sit at the bottom. Stats, stock and choices all use it.
 */
export function Tile({
  visual,
  size = "md",
  selected,
  onClick,
  className,
  children,
}: {
  visual?: ReactNode;
  size?: keyof typeof heights;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
  children: ReactNode;
}) {
  const body = (
    <>
      {visual && <span className="absolute top-3 right-3">{visual}</span>}
      <div className="relative">{children}</div>
    </>
  );
  const classes = cn(
    "relative flex flex-col justify-end overflow-hidden rounded-3xl bg-surface p-4 text-left shadow-card",
    heights[size],
    selected && "outline-2 outline-accent",
    className,
  );
  if (onClick) {
    return (
      <button
        type="button"
        aria-pressed={selected}
        onClick={onClick}
        className={cn(classes, "transition-transform active:scale-97")}
      >
        {body}
      </button>
    );
  }
  return <div className={classes}>{body}</div>;
}

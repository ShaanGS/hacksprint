import type { ReactNode } from "react";
import { Art, type ArtName } from "@/components/ui/art";
import { cn } from "@/lib/cn";

/**
 * A grey tile with its art anchored in the top right corner, allowed to bleed off the edge; the
 * words sit at the bottom. Stats, stock and choices all use it.
 */
export function Tile({
  art,
  artSize = 88,
  selected,
  onClick,
  className,
  children,
}: {
  art?: ArtName;
  artSize?: number;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
  children: ReactNode;
}) {
  const body = (
    <>
      {art && <Art name={art} size={artSize} className="absolute -top-2 -right-2" />}
      <div className="relative">{children}</div>
    </>
  );
  const classes = cn(
    "relative flex min-h-36 flex-col justify-end overflow-hidden rounded-2xl bg-surface-muted p-4 text-left",
    selected && "outline-2 outline-ink",
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

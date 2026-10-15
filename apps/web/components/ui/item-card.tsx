import type { ReactNode } from "react";
import { Art, type ArtName } from "@/components/ui/art";
import { cn } from "@/lib/cn";

/**
 * One product in the conversation: something the shop added, something that is out, or what it
 * suggests instead. The picture does the talking; a tag and at most one action do the rest.
 */
export function ItemCard({
  art,
  name,
  meta,
  tag,
  out,
  suggested,
  action,
}: {
  art: ArtName;
  name: string;
  /** "× 2", "அரை கிலோ · ₹35". */
  meta?: ReactNode;
  tag?: ReactNode;
  /** Out of stock: the picture greys out. */
  out?: boolean;
  /** The shop's suggestion: outlined, so it reads as a choice. */
  suggested?: boolean;
  /** One full-width action under the product, so the name never has to shrink. */
  action?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl px-3 py-2",
        suggested ? "bg-surface outline-2 outline-ink" : "bg-surface-muted",
      )}
    >
      <div className="flex items-center gap-3">
        <Art name={art} size={56} className={cn(out && "opacity-50 grayscale")} />
        <div className="min-w-0 flex-1">
          {tag && <div className="mb-0.5">{tag}</div>}
          <p className={cn("truncate text-base font-semibold", out && "text-ink-muted")}>{name}</p>
          {meta && <p className="truncate text-sm text-ink-muted">{meta}</p>}
        </div>
      </div>
      {action && <div className="mt-1 mb-1">{action}</div>}
    </div>
  );
}

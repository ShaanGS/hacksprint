import { Package } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/cn";
import { productPhoto } from "@/lib/products/photos";

const sizes = {
  sm: { box: "size-12", px: 40 },
  md: { box: "size-16", px: 56 },
  lg: { box: "size-24", px: 88 },
  xl: { box: "size-32", px: 120 },
  /** Fills its card's width, square: the Stock grid. */
  fill: { box: "aspect-square w-full", px: 200 },
} as const;

/**
 * A product's own photo on a soft tile, like a quick-commerce listing; a plain icon for a product
 * we have no photo of yet.
 */
export function ProductImage({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: keyof typeof sizes;
  className?: string;
}) {
  const photo = productPhoto(name);
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-2xl bg-surface-muted",
        sizes[size].box,
        className,
      )}
    >
      {photo ? (
        <Image
          src={photo}
          alt=""
          width={sizes[size].px}
          height={sizes[size].px}
          className="pointer-events-none object-contain select-none"
        />
      ) : (
        <Package aria-hidden className="size-1/2 text-ink-faint" />
      )}
    </span>
  );
}

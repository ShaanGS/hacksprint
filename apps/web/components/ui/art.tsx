import Image from "next/image";
import { cn } from "@/lib/cn";

/** 3D toy art in public/art, all made from one prompt recipe (see design/DESIGN.md). */
export const artNames = [
  // The shop and its moments
  "shop",
  "mic",
  "bag",
  "khata",
  "bill",
  "coins",
  "savings",
  "phone-pay",
  "scooter",
  "clock",
  "crate",
  // Products
  "noodles",
  "butter",
  "sugar",
  "jaggery",
  "oil",
  "milk",
  "atta",
  "rice",
  "salt",
  "dal",
  "sambar",
  "chilli",
  "turmeric",
  "tea",
  "coffee",
  "curd",
  "ghee",
  "eggs",
  "bread",
  "batter",
  "chips",
  "biscuits",
  "cola",
  "water",
  "toothpaste",
  "soap",
  "detergent",
  "dishwash",
  "matchbox",
  "onion",
  "tomato",
  "coconut",
] as const;

export type ArtName = (typeof artNames)[number];

/** Product rows store their art name as text; anything unknown shows the shopping bag. */
export function toArtName(value: string): ArtName {
  return artNames.find((name) => name === value) ?? "bag";
}

export const bannerNames = ["voice", "approve", "bill", "night"] as const;

export type BannerName = (typeof bannerNames)[number];

/** Art sits straight on the surface, with no circle or box behind it. */
export function Art({
  name,
  size = 64,
  eager,
  className,
}: {
  name: ArtName;
  size?: number;
  /** A screen's hero: load it straight away rather than when it scrolls into view. */
  eager?: boolean;
  className?: string;
}) {
  return (
    <Image
      src={`/art/${name}.png`}
      alt=""
      width={size}
      height={size}
      loading={eager ? "eager" : "lazy"}
      className={cn("pointer-events-none shrink-0 object-contain select-none", className)}
    />
  );
}

/**
 * A wide illustration. Decorative: the card's own text carries the meaning. `flush` drops the
 * rounding and ratio so a FeatureCard can set the height and let it meet the panel edge to edge.
 */
export function Banner({
  name,
  flush,
  className,
}: {
  name: BannerName;
  flush?: boolean;
  className?: string;
}) {
  return (
    <Image
      src={`/art/banner-${name}.jpg`}
      alt=""
      width={1280}
      height={720}
      sizes="(max-width: 430px) 100vw, 390px"
      className={cn("w-full object-cover", flush ? "h-full" : "aspect-video rounded-xl", className)}
    />
  );
}

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

const keywordRules: [RegExp, ArtName][] = [
  [/maggi|yippee|noodle|noodles|wai wai|top ramen|ramen/i, "noodles"],
  [/ponni|basmati|rice|sona masoori|paddy|arisi|chawal/i, "rice"],
  [/sunflower|groundnut|gingelly|mustard oil|sesame oil|\boil\b|ennai|tel/i, "oil"],
  [/atta|wheat|flour|maida|sooji|rava|godhumai|gehu/i, "atta"],
  [/milk|paal|doodh|toned milk/i, "milk"],
  [/sugar|sakkarai|cheeni/i, "sugar"],
  [/butter|vennai|makkhan|amul/i, "butter"],
  [/jaggery|vellam|gud/i, "jaggery"],
  [/toor dal|urad|moong|chana|dal|dhal|paruppu/i, "dal"],
  [/tea|chai|tea powder|theener/i, "tea"],
  [/coffee|kaapi/i, "coffee"],
  [/salt|uppu|namak/i, "salt"],
  [/curd|thayir|dahi/i, "curd"],
  [/ghee|nei/i, "ghee"],
  [/eggs?|muttai|anda/i, "eggs"],
  [/bread|roti/i, "bread"],
  [/batter|mavu|idli dosa batter/i, "batter"],
  [/chips|lays|bingo|kurkure/i, "chips"],
  [/biscuits?|cookies?|parle|britannia|oreo/i, "biscuits"],
  [/cola|pepsi|coke|soda|thums up/i, "cola"],
  [/water|mineral water/i, "water"],
  [/toothpaste|colgate|pepsodent|close up/i, "toothpaste"],
  [/soap|lifebuoy|lux|dettol|hamam/i, "soap"],
  [/detergent|surf excel|ariel|rin|tide/i, "detergent"],
  [/dishwash|vim|exo/i, "dishwash"],
  [/matchbox|matches|theepetti/i, "matchbox"],
  [/onion|vengayam|pyaz/i, "onion"],
  [/tomato|thakkali|tamatar/i, "tomato"],
  [/coconut|thengai|nariyal/i, "coconut"],
  [/sambar/i, "sambar"],
  [/chilli|mirch/i, "chilli"],
  [/turmeric|manjal|haldi/i, "turmeric"],
];

export function matchArtKeyword(text: string): ArtName | null {
  for (const [regex, art] of keywordRules) {
    if (regex.test(text)) return art;
  }
  return null;
}

/** Product rows store their art name as text; if bag or unknown, match by keyword from name or value. */
export function toArtName(value: string, name?: string | number): ArtName {
  if (value && value !== "bag") {
    const matched = artNames.find((n) => n === value);
    if (matched) return matched;
  }
  if (typeof name === "string") {
    const matchedByName = matchArtKeyword(name);
    if (matchedByName) return matchedByName;
  }
  if (value) {
    const matchedByValue = matchArtKeyword(value);
    if (matchedByValue) return matchedByValue;
    const direct = artNames.find((n) => n === value);
    if (direct) return direct;
  }
  return "bag";
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
  eager,
  className,
}: {
  name: BannerName;
  flush?: boolean;
  /** A screen's hero: load it straight away rather than when it scrolls into view. */
  eager?: boolean;
  className?: string;
}) {
  return (
    <Image
      src={`/art/banner-${name}.jpg`}
      alt=""
      width={1280}
      height={720}
      sizes="(max-width: 430px) 100vw, 390px"
      loading={eager ? "eager" : "lazy"}
      className={cn("w-full object-cover", flush ? "h-full" : "aspect-video rounded-xl", className)}
    />
  );
}

// Products with their own photo in public/products, generated to look like the real pack (or the
// real loose item) the way a quick-commerce listing shows it. A product without one falls back to a
// plain icon; tests/unit/product-photos.test.ts checks every name here has its file.

export const photographed = [
  "aachi-chilli-powder",
  "aachi-sambar-powder",
  "aachi-turmeric-powder",
  "aashirvaad-shudh-chakki-atta",
  "aavin-curd",
  "aavin-ghee",
  "aavin-toned-milk",
  "amul-butter",
  "arokya-toned-milk",
  "bisleri-water",
  "bombay-rava",
  "britannia-milk-bread",
  "coca-cola",
  "coconut",
  "colgate-strong-teeth",
  "eggs",
  "fortune-sunflower-oil",
  "gold-winner-sunflower-oil",
  "hamam-neem-soap",
  "idhayam-gingelly-oil",
  "idli-dosa-batter",
  "idli-rice",
  "jaggery",
  "lays-classic-salted",
  "maggi-masala-noodles",
  "moong-dal",
  "narasus-filter-coffee",
  "onion",
  "parachute-coconut-oil",
  "parle-g-biscuits",
  "ponni-raw-rice",
  "ship-matchbox",
  "sugar",
  "surf-excel-easy-wash",
  "tata-salt",
  "tata-tea-premium",
  "tomato",
  "toor-dal",
  "urad-dal",
  "vim-dishwash-bar",
] as const;

const known: ReadonlySet<string> = new Set(photographed);

/** "Lay's Classic Salted" → "lays-classic-salted": the photo's file name for a product. */
export function productSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** The product's photo path, or null when it has none yet. */
export function productPhoto(name: string): string | null {
  const slug = productSlug(name);
  return known.has(slug) ? `/products/${slug}.webp` : null;
}

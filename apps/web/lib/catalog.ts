import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { ProductUnit } from "@/lib/orders/quantity";

const productRow = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  pack_size: z.string().nullable(),
  category: z.string(),
  unit: z.enum(["kg", "litre", "pack", "piece"]),
  price_paise: z.number().int(),
  // numeric columns can arrive as strings
  stock_qty: z.coerce.number(),
  low_stock_threshold: z.coerce.number(),
  art: z.string(),
});

export type Product = {
  id: string;
  code: string;
  name: string;
  packSize: string | null;
  category: string;
  unit: ProductUnit;
  pricePaise: number;
  stockQty: number;
  lowStockThreshold: number;
  art: string;
};

export async function loadCatalog(db: SupabaseClient, shopId: string): Promise<Product[]> {
  const { data, error } = await db
    .from("products")
    .select(
      "id, code, name, pack_size, category, unit, price_paise, stock_qty, low_stock_threshold, art",
    )
    .eq("shop_id", shopId)
    .order("name");
  if (error) throw new Error(`Could not load the products: ${error.message}`);
  return z
    .array(productRow)
    .parse(data)
    .map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      packSize: row.pack_size,
      category: row.category,
      unit: row.unit,
      pricePaise: row.price_paise,
      stockQty: row.stock_qty,
      lowStockThreshold: row.low_stock_threshold,
      art: row.art,
    }));
}

/** The product list as the agent sees it: code, name, pack and unit, never price or stock. */
export function catalogForPrompt(products: Product[]): string {
  return products
    .map((p) => `${p.code}: ${p.name}${p.packSize ? `, ${p.packSize}` : ""} (sold per ${p.unit})`)
    .join("\n");
}

/** What to offer instead of an out-of-stock product: the same kind of thing, in stock. */
export function substitutesFor(product: Product, products: Product[]): Product[] {
  return products
    .filter((p) => p.category === product.category && p.id !== product.id && p.stockQty > 0)
    .slice(0, 2);
}

/** Names speech recognition should expect to hear. Saaras v4 takes up to 50. */
export function speechKeyterms(products: Product[]): string[] {
  return products.map((p) => p.name).slice(0, 50);
}

import type { Product } from "@/lib/catalog";
import type { ReorderLine } from "@/lib/owner/types";

/** A product is low when its stock is at or below its threshold. */
export function isLow(product: Product): boolean {
  return product.stockQty <= product.lowStockThreshold;
}

/** What to order from the distributor: each low product back up to twice its threshold. */
export function reorderList(products: Product[]): ReorderLine[] {
  return products.filter(isLow).map((product) => ({
    code: product.code,
    name: product.name,
    art: product.art,
    unit: product.unit,
    qty: Math.ceil(product.lowStockThreshold * 2 - product.stockQty),
  }));
}

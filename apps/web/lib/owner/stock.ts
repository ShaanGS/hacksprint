import type { Product } from "@/lib/catalog";

/** A product is low when its stock is at or below its threshold. */
export function isLow(product: Product): boolean {
  return product.stockQty <= product.lowStockThreshold;
}

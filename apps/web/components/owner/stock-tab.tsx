"use client";

import { useState, type ReactNode } from "react";
import { useOwnerLanguage } from "@/components/owner/owner-language";
import { toArtName } from "@/components/ui/art";
import { Badge } from "@/components/ui/badge";
import { Chip } from "@/components/ui/chip";
import { StockBar } from "@/components/ui/stock-bar";
import { Tile } from "@/components/ui/tile";
import type { Product } from "@/lib/catalog";
import { isLow } from "@/lib/owner/stock";

type Filter = "all" | "low" | "out";

/**
 * O2: the shelves at a glance, under today's delivery bill (spec B1). Every product is a tile
 * with its picture and how full it is; tapping it shows the bill behind its price.
 */
export function StockTab({
  products,
  bill,
  onProduct,
}: {
  products: Product[];
  bill: ReactNode;
  /** Opens where the product's price comes from (spec E3). */
  onProduct: (product: Product) => void;
}) {
  const { text } = useOwnerLanguage();
  const [filter, setFilter] = useState<Filter>("all");
  const low = products.filter((p) => isLow(p) && p.stockQty > 0);
  const out = products.filter((p) => p.stockQty <= 0);
  const shown = filter === "low" ? low : filter === "out" ? out : products;
  return (
    <main className="px-4 pt-6 pb-32">
      <h1 className="text-title font-extrabold tracking-tight">{text.tabs.stock}</h1>
      <p className="mt-1 text-base text-ink-muted">
        {text.stockSummary(products.length, low.length, out.length)}
      </p>
      <div className="mt-4">{bill}</div>
      <div className="mt-6 flex gap-2">
        {(["all", "low", "out"] as const).map((id) => (
          <Chip key={id} on={filter === id} onClick={() => setFilter(id)}>
            {text.filters[id]}
          </Chip>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {shown.map((product) => (
          <Tile
            key={product.code}
            art={toArtName(product.art)}
            artSize={80}
            size="lg"
            onClick={() => onProduct(product)}
          >
            {product.stockQty <= 0 ? (
              <Badge tone="danger">{text.outOfStock}</Badge>
            ) : (
              isLow(product) && <Badge tone="warning">{text.runningLow}</Badge>
            )}
            <p className="mt-1 line-clamp-2 text-base leading-snug font-semibold">{product.name}</p>
            <p className="mt-0.5 text-sm text-ink-muted tabular-nums">
              {text.left(product.stockQty, product.unit)}
            </p>
            <div className="mt-2">
              <StockBar stock={product.stockQty} threshold={product.lowStockThreshold} />
            </div>
          </Tile>
        ))}
      </div>
    </main>
  );
}

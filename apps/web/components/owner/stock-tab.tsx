"use client";

import { useState } from "react";
import { toArtName } from "@/components/ui/art";
import { Badge } from "@/components/ui/badge";
import { Chip } from "@/components/ui/chip";
import { StockBar } from "@/components/ui/stock-bar";
import { Tile } from "@/components/ui/tile";
import type { Product } from "@/lib/catalog";
import { isLow } from "@/lib/owner/stock";

type Filter = "all" | "low" | "out";

function left(product: Product): string {
  if (product.unit === "kg" || product.unit === "litre") {
    return `${product.stockQty} ${product.unit} left`;
  }
  if (product.unit === "piece") return `${product.stockQty} left`;
  return `${product.stockQty} ${product.stockQty === 1 ? "pack" : "packs"} left`;
}

/** O2: the shelves at a glance. Every product is a tile with its picture and how full it is. */
export function StockTab({ products }: { products: Product[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const low = products.filter((p) => isLow(p) && p.stockQty > 0);
  const out = products.filter((p) => p.stockQty <= 0);
  const shown = filter === "low" ? low : filter === "out" ? out : products;
  return (
    <main className="px-4 pt-6 pb-32">
      <h1 className="text-title font-extrabold tracking-tight">Stock</h1>
      <p className="mt-1 text-base text-ink-muted">
        {products.length} products · {low.length} running low · {out.length} out
      </p>
      <div className="mt-4 flex gap-2">
        <Chip on={filter === "all"} onClick={() => setFilter("all")}>
          All
        </Chip>
        <Chip on={filter === "low"} onClick={() => setFilter("low")}>
          Running low
        </Chip>
        <Chip on={filter === "out"} onClick={() => setFilter("out")}>
          Out
        </Chip>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {shown.map((product) => (
          <Tile key={product.code} art={toArtName(product.art)} artSize={80} size="lg">
            {product.stockQty <= 0 ? (
              <Badge tone="danger">Out of stock</Badge>
            ) : (
              isLow(product) && <Badge tone="warning">Running low</Badge>
            )}
            <p className="mt-1 line-clamp-2 text-base leading-snug font-semibold">{product.name}</p>
            <p className="mt-0.5 text-sm text-ink-muted tabular-nums">{left(product)}</p>
            <div className="mt-2">
              <StockBar stock={product.stockQty} threshold={product.lowStockThreshold} />
            </div>
          </Tile>
        ))}
      </div>
    </main>
  );
}

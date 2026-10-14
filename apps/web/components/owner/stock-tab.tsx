"use client";

import { useState } from "react";
import { Art, toArtName } from "@/components/ui/art";
import { Badge } from "@/components/ui/badge";
import { Chip } from "@/components/ui/chip";
import { ListRow } from "@/components/ui/list-row";
import type { Product } from "@/lib/catalog";
import { formatMoney } from "@/lib/money";
import { isLow } from "@/lib/owner/stock";

function left(product: Product): string {
  if (product.unit === "kg" || product.unit === "litre") {
    return `${product.stockQty} ${product.unit} left`;
  }
  if (product.unit === "piece") return `${product.stockQty} left`;
  return `${product.stockQty} ${product.stockQty === 1 ? "pack" : "packs"} left`;
}

function price(product: Product): string {
  const per = { kg: "a kg", litre: "a litre", pack: "each", piece: "each" }[product.unit];
  return `${formatMoney(product.pricePaise)} ${per}`;
}

/** O2: what the shop has, with what is running out first when filtered. */
export function StockTab({ products }: { products: Product[] }) {
  const [onlyLow, setOnlyLow] = useState(false);
  const shown = onlyLow ? products.filter(isLow) : products;
  return (
    <main className="px-4 pt-8 pb-6">
      <h1 className="text-title font-bold">Stock</h1>
      <div className="mt-4 flex gap-2">
        <Chip on={!onlyLow} onClick={() => setOnlyLow(false)}>
          All
        </Chip>
        <Chip on={onlyLow} onClick={() => setOnlyLow(true)}>
          Running low ({products.filter(isLow).length})
        </Chip>
      </div>
      <ul className="mt-3">
        {shown.map((product) => (
          <li key={product.code}>
            <ListRow
              art={<Art name={toArtName(product.art)} />}
              tag={
                product.stockQty <= 0 ? (
                  <Badge tone="danger">Out of stock</Badge>
                ) : (
                  isLow(product) && <Badge>Low</Badge>
                )
              }
              title={product.name}
              meta={`${left(product)} · ${price(product)}`}
            />
          </li>
        ))}
      </ul>
    </main>
  );
}

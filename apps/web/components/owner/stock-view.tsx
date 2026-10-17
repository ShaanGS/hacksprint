"use client";

import { useState } from "react";
import { BillScan } from "@/components/owner/bill-scan";
import { Margins } from "@/components/owner/margins";
import { PriceSheet } from "@/components/owner/source-sheet";
import { StockTab } from "@/components/owner/stock-tab";
import { useStock } from "@/components/owner/use-stock";
import { Art } from "@/components/ui/art";
import type { Product } from "@/lib/catalog";
import type { OwnerBackend } from "@/lib/owner/backend";
import type { PriceSource } from "@/lib/sources/types";

/** The Stock tab with its data: the shelves, today's bill, and where each price comes from. */
export function StockView({ backend }: { backend: OwnerBackend }) {
  const stock = useStock(backend);
  const [pricing, setPricing] = useState<Product | null>(null);
  const [source, setSource] = useState<PriceSource | null>(null);

  function showPrice(product: Product) {
    setPricing(product);
    setSource(null);
    backend.priceSource(product).then(setSource, () => setPricing(null));
  }

  if (!stock.products) {
    return (
      <div className="grid h-full place-items-center">
        <Art name="crate" size={120} eager />
      </div>
    );
  }
  return (
    <>
      <StockTab
        products={stock.products}
        onProduct={showPrice}
        bill={
          <div className="space-y-3">
            <BillScan backend={backend} products={stock.products} onAdded={stock.reload} />
            <Margins backend={backend} />
          </div>
        }
      />
      <PriceSheet open={pricing !== null} source={source} onClose={() => setPricing(null)} />
    </>
  );
}

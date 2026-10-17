import { useCallback, useEffect, useState } from "react";
import type { Product } from "@/lib/catalog";
import type { OwnerBackend } from "@/lib/owner/backend";

/** The shelves, fetched when the Stock tab opens and again after a bill adds to them. */
export function useStock(backend: OwnerBackend) {
  const [products, setProducts] = useState<Product[] | null>(null);

  useEffect(() => {
    let current = true;
    backend.stock().then(
      (next) => {
        if (current) setProducts(next);
      },
      // The tab keeps what it showed last; the next visit tries again.
      () => undefined,
    );
    return () => {
      current = false;
    };
  }, [backend]);

  const reload = useCallback(() => {
    backend.stock().then(setProducts, () => undefined);
  }, [backend]);

  return { products, reload };
}

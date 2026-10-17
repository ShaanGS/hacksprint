"use client";

import { Art, toArtName } from "@/components/ui/art";
import { ListRow } from "@/components/ui/list-row";
import type { Product } from "@/lib/catalog";

function words(text: string): Set<string> {
  return new Set(text.toLowerCase().match(/[a-z]{3,}/g) ?? []);
}

/** Products sharing a word with what the bill printed come first: likely, not certain. */
export function likelyFirst(products: Product[], printedName: string): Product[] {
  const printed = words(printedName);
  const shared = (p: Product) => [...words(p.name)].filter((w) => printed.has(w)).length;
  return [...products].sort((a, b) => shared(b) - shared(a) || a.name.localeCompare(b.name));
}

/** Pick the product a bill line is, by tapping (rule 7: the owner never types). */
export function ProductPicker({
  products,
  printedName,
  onPick,
}: {
  products: Product[];
  printedName: string;
  onPick: (product: Product) => void;
}) {
  return (
    <ul className="-mx-3">
      {likelyFirst(products, printedName).map((product) => (
        <li key={product.id}>
          <ListRow
            art={<Art name={toArtName(product.art)} size={44} />}
            title={product.name}
            meta={product.packSize ?? undefined}
            onClick={() => onPick(product)}
          />
        </li>
      ))}
    </ul>
  );
}

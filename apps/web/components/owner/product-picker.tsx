"use client";

import { Art, toArtName } from "@/components/ui/art";
import { ListRow } from "@/components/ui/list-row";

/** What a picker needs to show a product; the Stock tab's rows carry it. */
export type Pickable = { id: string; name: string; art: string; packSize: string | null };

function words(text: string): Set<string> {
  return new Set(text.toLowerCase().match(/[a-z]{3,}/g) ?? []);
}

/** Products sharing a word with what the bill printed come first: likely, not certain. */
export function likelyFirst(products: Pickable[], printedName: string): Pickable[] {
  const printed = words(printedName);
  const shared = (p: Pickable) => [...words(p.name)].filter((w) => printed.has(w)).length;
  return [...products].sort((a, b) => shared(b) - shared(a) || a.name.localeCompare(b.name));
}

/** Pick the product a bill line is, by tapping (rule 6: the owner never types). */
export function ProductPicker({
  products,
  printedName,
  onPick,
}: {
  products: Pickable[];
  printedName: string;
  onPick: (product: Pickable) => void;
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

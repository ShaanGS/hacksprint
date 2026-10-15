import type { Product } from "@/lib/catalog";
import { normalizeQuantity } from "@/lib/orders/quantity";
import { lineTotalPaise } from "@/lib/orders/totals";
import type { Choice, TurnItem } from "@/lib/voice/turns";

// What the customer sees next to the shop's reply. Built by code from the catalogue, so the
// price on a suggestion comes from the database (guardrail 1), never from the model.

/** A product the customer can tap to add, at the quantity they asked for, with its line price. */
export function choiceFor(product: Product, requestedQty: number): Choice {
  const check = normalizeQuantity(product.unit, requestedQty);
  const qty = check.ok ? check.qty : 1;
  return {
    label: product.name,
    code: product.code,
    qty,
    unit: product.unit,
    art: product.art,
    linePaise: lineTotalPaise({ qty, unitPricePaise: product.pricePaise }),
  };
}

/** A card for the shop's reply: a product it just added, or one that is out of stock. */
export function itemFor(product: Product, qty: number, state: TurnItem["state"]): TurnItem {
  return {
    code: product.code,
    name: product.name,
    art: product.art,
    qty,
    unit: product.unit,
    state,
  };
}

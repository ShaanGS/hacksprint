import { ownerTextFor } from "@/lib/i18n/owner";
import type { Lang } from "@/lib/i18n/languages";
import { quantityPhrase } from "@/lib/i18n/speech";
import { formatMoney } from "@/lib/money";
import type { OwnerOrder } from "@/lib/owner/types";

/**
 * What the owner's phone says when an order arrives, in the owner's language whatever language
 * the customer ordered in: who, what, the total, and the question. Built by code, so the total
 * is the server's.
 */
export function announcement(order: OwnerOrder, ownerLang: Lang): string {
  const items = order.lines
    .map((line) => `${quantityPhrase(line.qty, line.unit, ownerLang)} ${line.name}`)
    .join(", ");
  return ownerTextFor(ownerLang).announce(order.customer, items, formatMoney(order.totalPaise));
}

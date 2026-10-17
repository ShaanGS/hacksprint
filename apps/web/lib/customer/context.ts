import { currentCustomerId } from "@/lib/auth/cookies";
import { loadCatalog } from "@/lib/catalog";
import { findCustomer, type Customer } from "@/lib/customers";
import { HttpError } from "@/lib/http";
import type { Lang } from "@/lib/i18n/languages";
import { openDraft } from "@/lib/orders/cart";
import { getShop, type Shop } from "@/lib/shop";
import { createServiceClient } from "@/lib/supabase/server";
import type { Conversation } from "@/lib/voice/conversation";

/** The signed-in customer, or 401: every customer route starts here. */
export async function requireCustomer(): Promise<{
  db: ReturnType<typeof createServiceClient>;
  shop: Shop;
  customer: Customer;
}> {
  const customerId = await currentCustomerId();
  if (!customerId) throw new HttpError(401, "Please start again from the shop's QR code.");
  const db = createServiceClient();
  const [customer, shop] = await Promise.all([findCustomer(db, customerId), getShop(db)]);
  // A demo reset removes customers who joined during the event; they simply start again.
  if (!customer) throw new HttpError(401, "Please start again from the shop's QR code.");
  return { db, shop, customer };
}

/** Everything a turn needs: the customer, their open order and the catalogue. */
export async function customerConversation(lang: Lang): Promise<Conversation> {
  const { db, shop, customer } = await requireCustomer();
  const [orderId, products] = await Promise.all([
    openDraft(db, shop.id, customer.id, lang),
    loadCatalog(db, shop.id),
  ]);
  return { db, shop, customer, lang, orderId, products };
}

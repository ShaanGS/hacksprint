import { z } from "zod";
import { currentCustomerId, startCustomerSession } from "@/lib/auth/cookies";
import { activeOrderNumber } from "@/lib/customer/order-view";
import { normalizePhone } from "@/lib/customer/phone";
import { findCustomer, saveCustomer } from "@/lib/customers";
import { handle, HttpError, readJson } from "@/lib/http";
import { langs } from "@/lib/i18n/languages";
import { getShop } from "@/lib/shop";
import { createServiceClient } from "@/lib/supabase/server";
import { openConversation } from "@/lib/voice/conversation";

const startBody = z.object({
  name: z.string().trim().min(1).max(60),
  phone: z.string().min(1),
  lang: z.enum(langs),
});

/** Name, phone and language, once: the customer is remembered and the shop greets them. */
export function POST(request: Request) {
  return handle(async () => {
    const body = await readJson(request, startBody);
    const phone = normalizePhone(body.phone);
    if (!phone) throw new HttpError(400, "Enter a 10-digit mobile number.");
    const db = createServiceClient();
    const shop = await getShop(db);
    const customer = await saveCustomer(db, shop.id, { name: body.name, phone, lang: body.lang });
    await startCustomerSession(customer.id);
    const { turns, cart } = await openConversation(db, shop, customer, body.lang);
    return Response.json({ turns, cart, review: false });
  });
}

/** Who is on this phone, and the order they are waiting on, so a rescan picks up where they were. */
export function GET() {
  return handle(async () => {
    const customerId = await currentCustomerId();
    if (!customerId) return Response.json({ customer: null, activeOrder: null });
    const db = createServiceClient();
    const customer = await findCustomer(db, customerId);
    if (!customer) return Response.json({ customer: null, activeOrder: null });
    return Response.json({
      customer: { name: customer.name, phone: customer.phone, lang: customer.lang },
      activeOrder: await activeOrderNumber(db, customer.id),
    });
  });
}

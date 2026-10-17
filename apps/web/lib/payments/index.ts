import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { appEnv } from "@/lib/env";
import { transition, type Actor } from "@/lib/orders/state";
import { createPaymentLink } from "@/lib/paytm/client";
import type { Shop } from "@/lib/shop";

// Payment links for approved orders (spec A7). The shop's payment mode picks the provider:
// Paytm when its keys are in, otherwise our own test payment page. Both end in markPaid, the one
// way an order becomes paid, which is safe to call twice (guardrail 5).

export type PayableOrder = { id: string; number: number; totalPaise: number };

const paymentRow = z.object({ link_url: z.string().nullable() });
const paidRow = z.object({ order_id: z.string() });

/** The order's payment link, created once: asking again returns the same link. */
export async function paymentLinkFor(
  db: SupabaseClient,
  shop: Shop,
  order: PayableOrder,
): Promise<string> {
  const { data: existing, error } = await db
    .from("payments")
    .select("link_url")
    .eq("order_id", order.id)
    .in("status", ["created", "paid"])
    .maybeSingle();
  if (error) throw new Error(`Could not read payments: ${error.message}`);
  const url = existing ? paymentRow.parse(existing).link_url : null;
  if (url) return url;
  return shop.paymentMode === "paytm" ? paytmLink(db, shop, order) : testLink(db, order);
}

async function testLink(db: SupabaseClient, order: PayableOrder): Promise<string> {
  const id = randomUUID();
  const url = `${appEnv().APP_URL}/pay/${id}`;
  const { error } = await db.from("payments").insert({
    id,
    order_id: order.id,
    provider: "test",
    provider_link_id: id,
    link_url: url,
    amount_paise: order.totalPaise,
  });
  if (error) throw new Error(`Could not create the payment: ${error.message}`);
  return url;
}

async function paytmLink(db: SupabaseClient, shop: Shop, order: PayableOrder): Promise<string> {
  const link = await createPaymentLink({
    amountPaise: order.totalPaise,
    // Paytm allows only letters and digits here.
    linkName: `Order${order.number}`,
    description: `Order ${order.number} ${shop.name}`.replace(/[^A-Za-z0-9 ]/g, "").slice(0, 30),
    callbackUrl: `${appEnv().APP_URL}/api/webhooks/paytm`,
  });
  const { error } = await db.from("payments").insert({
    order_id: order.id,
    provider: "paytm",
    provider_link_id: String(link.linkId),
    link_url: link.shortUrl,
    amount_paise: order.totalPaise,
  });
  if (error) throw new Error(`Could not save the Paytm link: ${error.message}`);
  return link.shortUrl;
}

/**
 * Marks a payment paid and moves its order to paid, which takes the items out of stock. Only a
 * payment still waiting can be marked, so a repeated callback or a double tap changes nothing
 * and returns false.
 */
export async function markPaid(
  db: SupabaseClient,
  payment: { id: string } | { providerLinkId: string },
  txnId: string,
  actor: Actor,
): Promise<boolean> {
  const match = "id" in payment ? { id: payment.id } : { provider_link_id: payment.providerLinkId };
  const { data, error } = await db
    .from("payments")
    .update({ status: "paid", paid_at: new Date().toISOString(), provider_txn_id: txnId })
    .match(match)
    .eq("status", "created")
    .select("order_id")
    .maybeSingle();
  if (error) throw new Error(`Could not record the payment: ${error.message}`);
  if (!data) return false;
  return transition(db, {
    orderId: paidRow.parse(data).order_id,
    from: "awaiting_payment",
    to: "paid",
    actor,
  });
}

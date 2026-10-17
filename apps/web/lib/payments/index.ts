import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { appEnv } from "@/lib/env";
import { transition, type Actor } from "@/lib/orders/state";
import { createPaymentLink } from "@/lib/paytm/client";
import { broadcastChanged } from "@/lib/realtime";
import type { Shop } from "@/lib/shop";

// Payment links (spec A4) and the one way a payment becomes paid (A5). The shop's payment
// mode picks the provider: Paytm when its keys are in, otherwise our own test payment page. A
// paid credit link writes a verified repayment; a paid order link moves the (frozen) order; a
// paid stock-order link (test mode) is only recorded.
// markPaid only moves a payment still waiting, so a repeated callback or a double tap changes
// nothing (spec rule 4).

export type PayableOrder = { id: string; number: number; totalPaise: number };

type NewLink = {
  amountPaise: number;
  /** Paytm allows only letters and digits here. */
  linkName: string;
  description: string;
  row: Record<string, unknown>;
};

const linkRow = z.object({ link_url: z.string().nullable() });
const paidRow = z.object({
  id: z.string(),
  shop_id: z.string(),
  order_id: z.string().nullable(),
  customer_id: z.string().nullable(),
  reminder_id: z.string().nullable(),
  purchase_order_id: z.string().nullable(),
  amount_paise: z.number().int(),
});

async function createLink(
  db: SupabaseClient,
  shop: Shop,
  link: NewLink,
): Promise<{ id: string; url: string }> {
  if (shop.paymentMode === "paytm") {
    const paytm = await createPaymentLink({
      amountPaise: link.amountPaise,
      linkName: link.linkName,
      description: link.description.replace(/[^A-Za-z0-9 ]/g, "").slice(0, 30),
      callbackUrl: `${appEnv().APP_URL}/api/webhooks/paytm`,
    });
    const { data, error } = await db
      .from("payments")
      .insert({
        ...link.row,
        shop_id: shop.id,
        provider: "paytm",
        provider_link_id: String(paytm.linkId),
        link_url: paytm.shortUrl,
        amount_paise: link.amountPaise,
      })
      .select("id")
      .single();
    if (error) throw new Error(`Could not save the Paytm link: ${error.message}`);
    return { id: z.object({ id: z.string() }).parse(data).id, url: paytm.shortUrl };
  }
  const id = randomUUID();
  const url = `${appEnv().APP_URL}/pay/${id}`;
  const { error } = await db.from("payments").insert({
    ...link.row,
    id,
    shop_id: shop.id,
    provider: "test",
    provider_link_id: id,
    link_url: url,
    amount_paise: link.amountPaise,
  });
  if (error) throw new Error(`Could not create the payment: ${error.message}`);
  return { id, url };
}

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
  const url = existing ? linkRow.parse(existing).link_url : null;
  if (url) return url;
  const link = await createLink(db, shop, {
    amountPaise: order.totalPaise,
    linkName: `Order${order.number}`,
    description: `Order ${order.number} ${shop.name}`,
    row: { order_id: order.id },
  });
  return link.url;
}

/** A link that settles what a customer owes, tied to its reminder. */
export function creditPaymentLink(
  db: SupabaseClient,
  shop: Shop,
  credit: { reminderId: string; customerId: string; amountPaise: number },
): Promise<{ id: string; url: string }> {
  return createLink(db, shop, {
    amountPaise: credit.amountPaise,
    linkName: `Credit${credit.reminderId.replace(/[^A-Za-z0-9]/g, "").slice(0, 12)}`,
    description: `Credit ${shop.name}`,
    row: {
      reminder_id: credit.reminderId,
      customer_id: credit.customerId,
      is_credit_repayment: true,
    },
  });
}

/**
 * A test-mode payment for a stock order the reorder agent sent (decision of Oct 17). In test mode
 * it lands in our own Paytm sandbox, not the distributor's; it is never counted as money in.
 */
export function stockOrderPaymentLink(
  db: SupabaseClient,
  shop: Shop,
  order: { purchaseOrderId: string; amountPaise: number },
): Promise<{ id: string; url: string }> {
  return createLink(db, shop, {
    amountPaise: order.amountPaise,
    linkName: `Stock${order.purchaseOrderId.replace(/[^A-Za-z0-9]/g, "").slice(0, 12)}`,
    description: `Stock order ${shop.name}`,
    row: { purchase_order_id: order.purchaseOrderId },
  });
}

/**
 * Marks a payment paid. A credit payment writes the verified repayment and clears its reminder;
 * an order payment moves the order to paid. Returns false when it was already paid.
 */
export async function markPaid(
  db: SupabaseClient,
  payment: { id: string } | { providerLinkId: string },
  txnId: string,
  actor: Actor,
): Promise<boolean> {
  const match = "id" in payment ? { id: payment.id } : { provider_link_id: payment.providerLinkId };
  const paidAt = new Date().toISOString();
  const { data, error } = await db
    .from("payments")
    .update({ status: "paid", paid_at: paidAt, provider_txn_id: txnId })
    .match(match)
    .eq("status", "created")
    .select("id, shop_id, order_id, customer_id, reminder_id, purchase_order_id, amount_paise")
    .maybeSingle();
  if (error) throw new Error(`Could not record the payment: ${error.message}`);
  if (!data) return false;
  const paid = paidRow.parse(data);
  if (paid.order_id) {
    return transition(db, { orderId: paid.order_id, from: "awaiting_payment", to: "paid", actor });
  }
  if (paid.purchase_order_id) {
    // A test payment for a stock order changes none of the shop's numbers, so nothing is broadcast.
    await audit(db, paid.shop_id, [
      {
        actor,
        action: "reorder.paid_test",
        entityType: "purchase_order",
        entityId: paid.purchase_order_id,
        payload: { paymentId: paid.id, amountPaise: paid.amount_paise },
      },
    ]);
    return true;
  }
  if (paid.customer_id) await settleCredit(db, paid, paidAt, actor);
  return true;
}

async function settleCredit(
  db: SupabaseClient,
  paid: z.infer<typeof paidRow>,
  paidAt: string,
  actor: Actor,
) {
  const { error } = await db.from("credit_ledger").insert({
    shop_id: paid.shop_id,
    customer_id: paid.customer_id,
    kind: "repayment",
    amount_paise: -paid.amount_paise,
    note: "Paid by link",
    source: "verified_payment",
    payment_id: paid.id,
    created_at: paidAt,
  });
  if (error) throw new Error(`Could not write the repayment: ${error.message}`);
  if (paid.reminder_id) {
    const cleared = await db
      .from("credit_reminders")
      .update({ status: "paid" })
      .eq("id", paid.reminder_id);
    if (cleared.error) throw new Error(`Could not clear the reminder: ${cleared.error.message}`);
  }
  await audit(db, paid.shop_id, [
    {
      actor,
      action: "credit.paid_by_link",
      entityType: "payment",
      entityId: paid.id,
      payload: { customerId: paid.customer_id, amountPaise: paid.amount_paise },
    },
  ]);
  await broadcastChanged(db, paid.shop_id, ["credit", "rotation"]);
}

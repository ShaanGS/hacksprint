import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { HttpError } from "@/lib/http";
import { transition, type RejectReason } from "@/lib/orders/state";
import type { PaymentMode } from "@/lib/orders/submit";
import { paymentLinkFor } from "@/lib/payments";
import type { Shop } from "@/lib/shop";

// The owner's three decisions on an order (spec A6, A7). Every move goes through transition()
// (guardrail 4), which writes the audit log; money only moves after the owner says yes.

const orderRow = z.object({
  id: z.string(),
  number: z.coerce.number(),
  status: z.string(),
  payment_mode: z.enum(["link", "credit"]).nullable(),
  total_paise: z.number().int(),
});

async function loadOrder(db: SupabaseClient, shopId: string, orderId: string) {
  const { data, error } = await db
    .from("orders")
    .select("id, number, status, payment_mode, total_paise")
    .eq("id", orderId)
    .eq("shop_id", shopId)
    .maybeSingle();
  if (error) throw new Error(`Could not read the order: ${error.message}`);
  if (!data) throw new HttpError(404, "No such order.");
  return orderRow.parse(data);
}

export type Approval = { status: "awaiting_payment" | "on_credit"; payUrl: string | null };

/**
 * Approves an order. On account, it is done (the ledger and stock move in the database). With a
 * link, the decision is saved first and the link made after, so a Paytm hiccup never loses the
 * approval: payUrl comes back null and the owner can retry.
 */
export async function approveOrder(
  db: SupabaseClient,
  shop: Shop,
  orderId: string,
  mode?: PaymentMode,
): Promise<Approval> {
  const order = await loadOrder(db, shop.id, orderId);
  if (order.status !== "pending_approval")
    throw new HttpError(409, "This order was already decided.");
  const chosen = mode ?? order.payment_mode ?? "link";
  if (chosen !== order.payment_mode) {
    const { error } = await db
      .from("orders")
      .update({ payment_mode: chosen })
      .eq("id", orderId)
      .eq("status", "pending_approval");
    if (error) throw new Error(`Could not change how the order is paid: ${error.message}`);
  }
  const to = chosen === "credit" ? "on_credit" : "awaiting_payment";
  // A tap and a spoken "seri" can land together; only the first one moves the order.
  const moved = await transition(db, { orderId, from: "pending_approval", to, actor: "owner" });
  if (!moved) throw new HttpError(409, "This order was already decided.");
  if (to === "on_credit") return { status: to, payUrl: null };
  return { status: to, payUrl: await retryLink(db, shop, orderId) };
}

/** Makes (or returns) the payment link for an approved order; null if the provider failed. */
export async function retryLink(
  db: SupabaseClient,
  shop: Shop,
  orderId: string,
): Promise<string | null> {
  const order = await loadOrder(db, shop.id, orderId);
  try {
    return await paymentLinkFor(db, shop, {
      id: order.id,
      number: order.number,
      totalPaise: order.total_paise,
    });
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function rejectOrder(
  db: SupabaseClient,
  shopId: string,
  orderId: string,
  reason: RejectReason,
): Promise<void> {
  await loadOrder(db, shopId, orderId);
  const moved = await transition(db, {
    orderId,
    from: "pending_approval",
    to: "rejected",
    actor: "owner",
    reason,
  });
  if (!moved) throw new HttpError(409, "This order was already decided.");
}

export async function deliverOrder(
  db: SupabaseClient,
  shopId: string,
  orderId: string,
): Promise<void> {
  const order = await loadOrder(db, shopId, orderId);
  const from = order.status === "paid" ? "paid" : order.status === "on_credit" ? "on_credit" : null;
  if (!from) throw new HttpError(409, "Only a paid or on-account order can be delivered.");
  await transition(db, { orderId, from, to: "delivered", actor: "owner" });
}

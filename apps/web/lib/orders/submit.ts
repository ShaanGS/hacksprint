import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { readCart } from "@/lib/orders/cart";
import { transition } from "@/lib/orders/state";

export type PaymentMode = "link" | "credit";

export type SubmitResult =
  { ok: true; number: number } | { ok: false; reason: "empty" | "already_sent" };

const numberRow = z.object({ number: z.coerce.number() });

/**
 * Sends the customer's draft to the owner. The total is fixed here, from the stored lines, so the
 * owner approves exactly what the customer saw.
 */
export async function submitOrder(
  db: SupabaseClient,
  orderId: string,
  paymentMode: PaymentMode,
): Promise<SubmitResult> {
  const cart = await readCart(db, orderId);
  if (cart.lines.length === 0) return { ok: false, reason: "empty" };

  const update = await db
    .from("orders")
    .update({ total_paise: cart.totalPaise, payment_mode: paymentMode })
    .eq("id", orderId)
    .eq("status", "draft");
  if (update.error) throw new Error(`Could not save the order: ${update.error.message}`);

  const moved = await transition(db, {
    orderId,
    from: "draft",
    to: "pending_approval",
    actor: "customer",
  });
  if (!moved) return { ok: false, reason: "already_sent" };

  const { data, error } = await db.from("orders").select("number").eq("id", orderId).single();
  if (error) throw new Error(`Could not read the order number: ${error.message}`);
  return { ok: true, number: numberRow.parse(data).number };
}

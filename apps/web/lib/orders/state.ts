import type { SupabaseClient } from "@supabase/supabase-js";

// The order states from spec section 8, and the only moves between them. Every status change
// goes through `transition` (guardrail 4), which calls the database function that also
// moves stock and credit in the same transaction.

export const orderStatuses = [
  "draft",
  "pending_approval",
  "rejected",
  "awaiting_payment",
  "paid",
  "on_credit",
  "delivered",
] as const;

export type OrderStatus = (typeof orderStatuses)[number];

export type RejectReason = "out_of_stock" | "shop_closed" | "cannot_deliver" | "other";

export type Actor = "agent" | "owner" | "customer" | "system" | "paytm";

const allowed: Record<OrderStatus, readonly OrderStatus[]> = {
  draft: ["pending_approval"],
  pending_approval: ["rejected", "awaiting_payment", "on_credit"],
  awaiting_payment: ["paid"],
  paid: ["delivered"],
  on_credit: ["delivered"],
  rejected: [],
  delivered: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return allowed[from].includes(to);
}

export class TransitionError extends Error {
  constructor(from: OrderStatus, to: OrderStatus) {
    super(`An order cannot go from ${from} to ${to}`);
    this.name = "TransitionError";
  }
}

/**
 * Moves an order from `from` to `to`. Returns false when the order was no longer in `from`:
 * someone already moved it, so a repeated approval or payment callback does nothing.
 */
export async function transition(
  db: SupabaseClient,
  move: {
    orderId: string;
    from: OrderStatus;
    to: OrderStatus;
    actor: Actor;
    reason?: RejectReason;
  },
): Promise<boolean> {
  if (!canTransition(move.from, move.to)) throw new TransitionError(move.from, move.to);
  const { data, error } = await db.rpc("transition_order", {
    p_order_id: move.orderId,
    p_from: move.from,
    p_to: move.to,
    p_actor: move.actor,
    p_reason: move.reason ?? null,
  });
  if (error) throw new Error(`Could not move order ${move.orderId}: ${error.message}`);
  return data === true;
}

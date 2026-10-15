import type { SupabaseClient } from "@supabase/supabase-js";

// The order states from docs/spec.md section 8 and guardrail 4.
// Status changes ONLY occur through `transitionOrder`.

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

export type Actor = "agent" | "owner" | "customer" | "system" | "paytm" | "n8n";

/**
 * The allowed state transitions:
 * draft -> pending_approval
 * pending_approval -> rejected | awaiting_payment | on_credit
 * awaiting_payment -> paid | on_credit
 * paid -> delivered
 * on_credit -> delivered
 * rejected and delivered are terminal states with no outbound transitions.
 */
const allowedTransitions: Record<OrderStatus, readonly OrderStatus[]> = {
  draft: ["pending_approval"],
  pending_approval: ["rejected", "awaiting_payment", "on_credit"],
  awaiting_payment: ["paid", "on_credit"],
  paid: ["delivered"],
  on_credit: ["delivered"],
  rejected: [],
  delivered: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  const targets = allowedTransitions[from];
  return targets ? targets.includes(to) : false;
}

export function getAllowedTransitions(from: OrderStatus): readonly OrderStatus[] {
  return allowedTransitions[from] ?? [];
}

export class TransitionError extends Error {
  readonly from: OrderStatus;
  readonly to: OrderStatus;

  constructor(from: OrderStatus, to: OrderStatus) {
    super(`Forbidden order transition from "${from}" to "${to}"`);
    this.name = "TransitionError";
    this.from = from;
    this.to = to;
  }
}

export type TransitionParams = {
  orderId: string;
  from: OrderStatus;
  to: OrderStatus;
  actor: Actor;
  shopId?: string;
  reason?: RejectReason;
  payload?: Record<string, unknown>;
};

/**
 * Moves an order from `from` to `to`, ensuring valid state machine transitions.
 * Performs an atomic check-and-set query. If the order was moved by another process,
 * it returns false (idempotent).
 * Upon successful transition, writes an entry to audit_log.
 */
export async function transitionOrder(
  db: SupabaseClient,
  params: TransitionParams,
): Promise<boolean> {
  const { orderId, from, to, actor, reason, payload } = params;

  if (!canTransition(from, to)) {
    throw new TransitionError(from, to);
  }

  // Atomically update only if current status equals `from`.
  const { data: updated, error: updateError } = await db
    .from("orders")
    .update({ status: to })
    .eq("id", orderId)
    .eq("status", from)
    .select("id, shop_id, status")
    .maybeSingle();

  if (updateError) {
    throw new Error(`Failed to update order status for ${orderId}: ${updateError.message}`);
  }

  // If no row matched, the order was already transitioned or does not exist.
  if (!updated) {
    return false;
  }

  const effectiveShopId = updated.shop_id ?? params.shopId;

  // Record every valid status change in the audit_log (guardrail 6).
  const { error: auditError } = await db.from("audit_log").insert({
    shop_id: effectiveShopId,
    actor,
    action: `order_status_${from}_to_${to}`,
    entity_type: "order",
    entity_id: orderId,
    payload: {
      from,
      to,
      ...(reason ? { reason } : {}),
      ...(payload ?? {}),
    },
  });

  if (auditError) {
    throw new Error(
      `Failed to write transition to audit_log for ${orderId}: ${auditError.message}`,
    );
  }

  return true;
}

/** Alias for transitionOrder. */
export const transition = transitionOrder;

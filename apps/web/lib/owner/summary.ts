import type { OwnerOrder } from "@/lib/owner/types";

// Today's money as the orders list shows it: paid links count as collected, approved orders on
// account as credit. Every amount is an order total the server worked out.

export type Takings = { collectedPaise: number; creditPaise: number };

function sum(orders: OwnerOrder[]): number {
  return orders.reduce((total, order) => total + order.totalPaise, 0);
}

export function takings(orders: OwnerOrder[]): Takings {
  const settled = (order: OwnerOrder, ...statuses: OwnerOrder["status"][]) =>
    statuses.includes(order.status);
  return {
    collectedPaise: sum(
      orders.filter((o) => o.paymentMode === "link" && settled(o, "paid", "delivered")),
    ),
    creditPaise: sum(
      orders.filter((o) => o.paymentMode === "credit" && settled(o, "on_credit", "delivered")),
    ),
  };
}

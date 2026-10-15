import type { CreditRow, DaySummary, OwnerOrder } from "@/lib/owner/types";
import { lineTotalPaise } from "@/lib/orders/totals";
import {
  earlierCredit,
  previewOrders,
  previewProduct,
  previewTotal,
  type PreviewOrder,
} from "@/lib/preview/data";

// The owner side of the preview: today's orders and the credit book from the sample data,
// in the same shapes the live screens will get.

/** Who owes the shop, most first: earlier credit plus today's orders on account. */
export function creditRows(orders: OwnerOrder[]): CreditRow[] {
  const owed = new Map<string, CreditRow>();
  for (const entry of earlierCredit) {
    owed.set(entry.customer, {
      customer: entry.customer,
      since: entry.since,
      owedPaise: previewTotal(entry.lines),
    });
  }
  for (const order of orders) {
    if (order.paymentMode !== "credit") continue;
    if (order.status !== "on_credit" && order.status !== "delivered") continue;
    const row = owed.get(order.customer) ?? {
      customer: order.customer,
      since: "today",
      owedPaise: 0,
    };
    owed.set(order.customer, { ...row, owedPaise: row.owedPaise + order.totalPaise });
  }
  return [...owed.values()].sort((a, b) => b.owedPaise - a.owedPaise);
}

export function previewOwnerOrders(): OwnerOrder[] {
  const orders = previewOrders.map(toOwnerOrder);
  const credit = creditRows(orders);
  return orders.map((order) => ({
    ...order,
    balancePaise: credit.find((row) => row.customer === order.customer)?.owedPaise ?? 0,
  }));
}

function toOwnerOrder(order: PreviewOrder): OwnerOrder {
  return {
    number: order.number,
    customer: order.customer,
    newCustomer: order.newCustomer,
    balancePaise: 0,
    placedAt: order.placedAt,
    status: order.status,
    paymentMode: order.paymentMode,
    lines: order.lines.map(({ code, qty }) => {
      const product = previewProduct(code);
      return {
        code,
        name: product.name,
        art: product.art,
        qty,
        unit: product.unit,
        lineTotalPaise: lineTotalPaise({ qty, unitPricePaise: product.pricePaise }),
      };
    }),
    totalPaise: previewTotal(order.lines),
    note: order.note ?? null,
    rejectReason: order.rejectReason ?? null,
  };
}

function sum(orders: OwnerOrder[]): number {
  return orders.reduce((total, order) => total + order.totalPaise, 0);
}

/** Today's numbers for the Today tab. */
export function daySummary(orders: OwnerOrder[]): DaySummary {
  const settled = (order: OwnerOrder, ...statuses: OwnerOrder["status"][]) =>
    statuses.includes(order.status);
  return {
    orders: orders.filter((order) => order.status !== "rejected").length,
    collectedPaise: sum(
      orders.filter((o) => o.paymentMode === "link" && settled(o, "paid", "delivered")),
    ),
    creditPaise: sum(
      orders.filter((o) => o.paymentMode === "credit" && settled(o, "on_credit", "delivered")),
    ),
    owedPaise: creditRows(orders).reduce((total, row) => total + row.owedPaise, 0),
  };
}

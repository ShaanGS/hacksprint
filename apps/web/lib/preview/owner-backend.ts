import type { Recorder } from "@/lib/audio/recorder";
import type { SubmittedStatus } from "@/lib/customer/backend";
import type { OwnerBackend } from "@/lib/owner/backend";
import type { OwnerOrder } from "@/lib/owner/types";
import { previewBills } from "@/lib/preview/bill";
import { previewProducts } from "@/lib/preview/data";
import { creditRows, previewOwnerOrders } from "@/lib/preview/owner";
import { takings } from "@/lib/owner/summary";
import type { HomeSource } from "@/lib/sources/types";

// The owner's screens on sample data. Moves follow transition_order: an order moves only from
// the state it is in. A link is "paid" a few seconds after approval, so the preview shows an
// order going all the way through.
const PREVIEW_PAYMENT_MS = 6000;

/** The preview has no microphone: a hold records an empty clip, and the preview hears "seri". */
export const previewRecorder: Recorder = {
  start() {},
  async stop() {
    return new Blob();
  },
};

export function previewOwner(): OwnerBackend {
  let orders = previewOwnerOrders();
  // This phone's own copy of the shelves, so a confirmed bill adds to them.
  const products = previewProducts.map((product) => ({ ...product }));
  const bills = previewBills(products);

  function move(
    id: string,
    from: SubmittedStatus,
    to: SubmittedStatus,
    change: Partial<OwnerOrder> = {},
  ) {
    orders = orders.map((order) =>
      order.id === id && order.status === from ? { ...order, ...change, status: to } : order,
    );
  }

  const backend: OwnerBackend = {
    async orders() {
      return orders.map((order) => ({ ...order }));
    },
    async approve(order, mode) {
      if ((mode ?? order.paymentMode) === "credit") {
        move(order.id, "pending_approval", "on_credit", { paymentMode: "credit" });
        return;
      }
      move(order.id, "pending_approval", "awaiting_payment", { payUrl: "#pay" });
      setTimeout(() => move(order.id, "awaiting_payment", "paid"), PREVIEW_PAYMENT_MS);
    },
    async reject(order, reason) {
      move(order.id, "pending_approval", "rejected", { rejectReason: reason });
    },
    async deliver(order) {
      move(order.id, order.status, "delivered");
    },
    async retryLink(order) {
      move(order.id, "awaiting_payment", "awaiting_payment", { payUrl: "#pay" });
    },
    // The preview cannot hear, so it acts as if the owner said "seri".
    async decideByVoice(order) {
      await backend.approve(order);
      return { heard: "சரி", decision: "approve" };
    },
    announcementUrl() {
      return null;
    },
    async stock() {
      return products.map((product) => ({ ...product }));
    },
    scanBill: bills.scanBill,
    confirmBill: bills.confirmBill,
    async home() {
      const saved = orders.filter((order) => order.status !== "rejected");
      const sources = await Promise.all(
        (["collected", "owed-to-shop", "owed-by-shop"] as const).map(backend.homeSource),
      );
      return {
        ordersCount: saved.length,
        ordersPaise: saved.reduce((total, order) => total + order.totalPaise, 0),
        collectedPaise: sources[0].totalPaise,
        owedToShopPaise: sources[1].totalPaise,
        owedByShopPaise: sources[2].totalPaise,
      };
    },
    async homeSource(kind): Promise<HomeSource> {
      const total = (rows: { amountPaise: number }[]) =>
        rows.reduce((sum, row) => sum + row.amountPaise, 0);
      const at = new Date().toISOString();
      if (kind === "orders") {
        const rows = orders
          .filter((order) => order.status !== "rejected")
          .map((order) => ({
            orderNumber: order.number,
            customer: order.customer,
            amountPaise: order.totalPaise,
            at,
          }));
        return { kind, totalPaise: total(rows), rows };
      }
      if (kind === "collected") {
        const paid = orders.filter(
          (o) => o.paymentMode === "link" && (o.status === "paid" || o.status === "delivered"),
        );
        const rows = paid.map((order) => ({
          orderNumber: order.number,
          customer: order.customer,
          amountPaise: order.totalPaise,
          at,
          reference: null,
        }));
        return { kind, totalPaise: takings(orders).collectedPaise, rows };
      }
      if (kind === "owed-to-shop") {
        const rows = creditRows(orders).map((row) => ({
          customer: row.customer,
          amountPaise: row.owedPaise,
        }));
        return { kind, totalPaise: total(rows), rows };
      }
      const rows = bills.payables();
      return { kind, totalPaise: total(rows), rows };
    },
    async priceSource(product) {
      return bills.priceSource(product);
    },
  };
  return backend;
}

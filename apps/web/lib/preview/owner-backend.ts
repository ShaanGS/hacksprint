import type { Recorder } from "@/lib/audio/recorder";
import type { SubmittedStatus } from "@/lib/customer/backend";
import type { OwnerBackend } from "@/lib/owner/backend";
import type { OwnerOrder } from "@/lib/owner/types";
import { previewOwnerOrders } from "@/lib/preview/owner";

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
  };
  return backend;
}

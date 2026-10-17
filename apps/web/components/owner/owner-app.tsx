"use client";

import { useState } from "react";
import { CreditTab } from "@/components/owner/credit-tab";
import { OrdersTab } from "@/components/owner/orders-tab";
import { StockTab } from "@/components/owner/stock-tab";
import { TabBar, type OwnerTab } from "@/components/owner/tab-bar";
import { TodayTab } from "@/components/owner/today-tab";
import type { SubmittedStatus } from "@/lib/customer/backend";
import type { RejectReason } from "@/lib/orders/state";
import { reportSentence } from "@/lib/owner/report";
import { isLow, reorderList } from "@/lib/owner/stock";
import type { OwnerOrder } from "@/lib/owner/types";
import { previewProducts, previewShop } from "@/lib/preview/data";
import { creditRows, daySummary, previewOwnerOrders } from "@/lib/preview/owner";

// In the preview, a customer pays their Paytm link this long after approval, so the owner
// can watch an order go all the way through.
const PREVIEW_PAYMENT_MS = 6000;

/** The owner's app: today's orders first, then stock, credit and the day's numbers. */
export function OwnerApp() {
  const [tab, setTab] = useState<OwnerTab>("orders");
  const [orders, setOrders] = useState<OwnerOrder[]>(previewOwnerOrders);

  // Like the database's transition_order: a move happens only from the state the order is in.
  function move(number: number, from: SubmittedStatus, to: SubmittedStatus, reason?: RejectReason) {
    setOrders((current) =>
      current.map((order) =>
        order.number === number && order.status === from
          ? { ...order, status: to, rejectReason: reason ?? order.rejectReason }
          : order,
      ),
    );
  }

  function approve(order: OwnerOrder) {
    if (order.paymentMode === "credit") {
      move(order.number, "pending_approval", "on_credit");
      return;
    }
    move(order.number, "pending_approval", "awaiting_payment");
    setTimeout(() => move(order.number, "awaiting_payment", "paid"), PREVIEW_PAYMENT_MS);
  }

  const summary = daySummary(orders);
  const low = previewProducts.filter(isLow).map((product) => product.name);
  const waiting = orders.filter((order) => order.status === "pending_approval").length;
  return (
    <div className="relative h-full">
      {/* Keyed on the tab, so each tab opens at its top. */}
      <div key={tab} className="h-full overflow-y-auto">
        {tab === "orders" && (
          <OrdersTab
            ownerName={previewShop.ownerName}
            orders={orders}
            summary={summary}
            onApprove={approve}
            onReject={(order, reason) => move(order.number, "pending_approval", "rejected", reason)}
            onDeliver={(order) => move(order.number, order.status, "delivered")}
          />
        )}
        {tab === "stock" && <StockTab products={previewProducts} />}
        {tab === "credit" && <CreditTab rows={creditRows(orders)} />}
        {tab === "today" && (
          <TodayTab
            shopName={previewShop.name}
            distributorName={previewShop.distributorName}
            summary={summary}
            report={reportSentence(summary, low)}
            reorder={reorderList(previewProducts)}
          />
        )}
      </div>
      <TabBar tab={tab} onChange={setTab} waiting={waiting} />
    </div>
  );
}

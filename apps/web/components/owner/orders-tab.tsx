"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { OrderCard } from "@/components/owner/order-card";
import { Amount } from "@/components/ui/amount";
import { Art } from "@/components/ui/art";
import { Badge } from "@/components/ui/badge";
import { ListRow } from "@/components/ui/list-row";
import type { RejectReason } from "@/lib/orders/state";
import type { OwnerOrder } from "@/lib/owner/types";

const progress: Partial<
  Record<OwnerOrder["status"], { tag: string; tone: "neutral" | "success"; note: string }>
> = {
  awaiting_payment: { tag: "Link sent", tone: "neutral", note: "Waiting for payment" },
  paid: { tag: "Paid", tone: "success", note: "Ready to deliver" },
  on_credit: { tag: "On account", tone: "neutral", note: "Ready to deliver" },
};

/** O1: orders that need the owner first, then the ones on their way, then today's finished. */
export function OrdersTab({
  shopName,
  orders,
  onApprove,
  onReject,
  onDeliver,
}: {
  shopName: string;
  orders: OwnerOrder[];
  onApprove: (order: OwnerOrder) => void;
  onReject: (order: OwnerOrder, reason: RejectReason) => void;
  onDeliver: (order: OwnerOrder) => void;
}) {
  const [showDone, setShowDone] = useState(false);
  const needsYou = orders.filter((o) => o.status === "pending_approval");
  const inProgress = orders.filter((o) => progress[o.status]);
  const done = orders.filter((o) => o.status === "delivered" || o.status === "rejected");

  return (
    <main className="px-4 pt-8 pb-6">
      <h1 className="text-title font-bold">Orders</h1>
      <p className="mt-1 text-base text-ink-muted">{shopName}</p>

      <h2 className="mt-6 text-xl font-bold">Needs you</h2>
      {needsYou.length === 0 ? (
        <div className="mt-3 flex items-center gap-3">
          <Art name="bag" />
          <p className="text-base text-ink-muted">New orders appear here.</p>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          {needsYou.map((order) => (
            <OrderCard
              key={order.number}
              order={order}
              onApprove={() => onApprove(order)}
              onReject={(reason) => onReject(order, reason)}
            />
          ))}
        </div>
      )}

      {inProgress.length > 0 && (
        <>
          <h2 className="mt-8 text-xl font-bold">On the way</h2>
          <ul className="mt-2">
            {inProgress.map((order) => {
              const step = progress[order.status];
              const canDeliver = order.status === "paid" || order.status === "on_credit";
              return (
                <li key={order.number}>
                  <ListRow
                    art={<Art name={order.status === "on_credit" ? "khata" : "coins"} />}
                    tag={step && <Badge tone={step.tone}>{step.tag}</Badge>}
                    title={order.customer}
                    meta={`#${order.number} · ${step?.note}`}
                    trailing={<Amount paise={order.totalPaise} />}
                  />
                  {canDeliver && (
                    <div className="flex justify-end px-3 pb-3">
                      <button
                        type="button"
                        onClick={() => onDeliver(order)}
                        className="min-h-11 rounded-full bg-surface-muted px-4 text-sm font-semibold active:scale-95"
                      >
                        Mark delivered
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}

      {done.length > 0 && (
        <>
          <button
            type="button"
            aria-expanded={showDone}
            onClick={() => setShowDone((open) => !open)}
            className="mt-8 flex min-h-11 w-full items-center justify-between text-xl font-bold"
          >
            Done today ({done.length})
            {showDone ? (
              <ChevronUp aria-hidden className="size-6" />
            ) : (
              <ChevronDown aria-hidden className="size-6" />
            )}
          </button>
          {showDone && (
            <ul className="mt-2">
              {done.map((order) => (
                <li key={order.number}>
                  <ListRow
                    art={<Art name="bag" />}
                    tag={
                      order.status === "rejected" ? (
                        <Badge tone="danger">Rejected</Badge>
                      ) : (
                        <Badge tone="success">Delivered</Badge>
                      )
                    }
                    title={order.customer}
                    meta={`#${order.number} · ${order.placedAt}`}
                    trailing={<Amount paise={order.totalPaise} />}
                  />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </main>
  );
}

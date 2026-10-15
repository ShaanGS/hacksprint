"use client";

import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { OrderCard } from "@/components/owner/order-card";
import { useDay } from "@/components/owner/use-day";
import { Amount } from "@/components/ui/amount";
import { Art } from "@/components/ui/art";
import { Badge } from "@/components/ui/badge";
import { ListRow } from "@/components/ui/list-row";
import { Monogram } from "@/components/ui/monogram";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/money";
import { soft } from "@/lib/motion";
import type { RejectReason } from "@/lib/orders/state";
import type { DaySummary, OwnerOrder } from "@/lib/owner/types";

const progress: Partial<
  Record<OwnerOrder["status"], { tag: string; tone: "neutral" | "success"; note: string }>
> = {
  awaiting_payment: { tag: "Link sent", tone: "neutral", note: "Waiting for payment" },
  paid: { tag: "Paid", tone: "success", note: "Ready to deliver" },
  on_credit: { tag: "On account", tone: "neutral", note: "Ready to deliver" },
};

/**
 * O1: one order in front of the owner at a time, oldest first, with the rest queued under it,
 * so there is only ever one Approve button on screen. Then what is on its way, then what is done.
 */
export function OrdersTab({
  ownerName,
  orders,
  summary,
  onApprove,
  onReject,
  onDeliver,
}: {
  ownerName: string;
  orders: OwnerOrder[];
  summary: DaySummary;
  onApprove: (order: OwnerOrder) => void;
  onReject: (order: OwnerOrder, reason: RejectReason) => void;
  onDeliver: (order: OwnerOrder) => void;
}) {
  const day = useDay();
  const [focus, setFocus] = useState<number | null>(null);
  const [showDone, setShowDone] = useState(false);
  const pending = orders
    .filter((o) => o.status === "pending_approval")
    .sort((a, b) => a.number - b.number);
  const next = pending.find((o) => o.number === focus) ?? pending[0];
  const queue = pending.filter((o) => o !== next);
  const onTheWay = orders.filter((o) => progress[o.status]);
  const done = orders.filter((o) => o.status === "delivered" || o.status === "rejected");

  return (
    <main className="px-4 pt-6 pb-32">
      <p className="h-5 text-sm font-semibold text-ink-muted">{day?.date}</p>
      <h1 className="text-title font-extrabold tracking-tight">
        {day ? `${day.greeting}, ${ownerName}` : ownerName}
      </h1>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Stat label="Needs you" value={String(pending.length)} />
        <Stat label="Collected" value={formatMoney(summary.collectedPaise)} good />
        <Stat label="On account" value={formatMoney(summary.creditPaise)} />
      </div>

      <h2 className="mt-7 text-xl font-extrabold tracking-tight">Needs you</h2>
      <div className="mt-3">
        <AnimatePresence mode="popLayout" initial={false}>
          {next ? (
            <motion.div
              key={next.number}
              layout
              initial={{ y: 24, scale: 0.98 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              transition={soft}
            >
              <OrderCard
                order={next}
                onApprove={() => onApprove(next)}
                onReject={(reason) => onReject(next, reason)}
              />
            </motion.div>
          ) : (
            <motion.div
              key="caught-up"
              layout
              className="flex items-center gap-4 rounded-3xl bg-tint-mint p-4"
            >
              <Art name="bag" size={72} />
              <p className="text-base font-medium">All caught up. New orders appear here.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {queue.length > 0 && (
        <ul className="-mx-3 mt-2">
          {queue.map((order) => (
            <li key={order.number}>
              <ListRow
                art={<Monogram name={order.customer} />}
                title={order.customer}
                meta={`#${order.number} · ${order.placedAt} · ${order.lines.length} items`}
                trailing={<Amount paise={order.totalPaise} size="md" />}
                onClick={() => setFocus(order.number)}
              />
            </li>
          ))}
        </ul>
      )}

      {onTheWay.length > 0 && (
        <>
          <h2 className="mt-8 text-xl font-extrabold tracking-tight">On the way</h2>
          <ul className="-mx-3 mt-2">
            {onTheWay.map((order) => {
              const step = progress[order.status];
              const canDeliver = order.status === "paid" || order.status === "on_credit";
              return (
                <motion.li key={order.number} layout transition={soft}>
                  <ListRow
                    art={<Monogram name={order.customer} />}
                    tag={step && <Badge tone={step.tone}>{step.tag}</Badge>}
                    title={order.customer}
                    meta={`#${order.number} · ${step?.note}`}
                    trailing={<Amount paise={order.totalPaise} size="md" />}
                  />
                  {canDeliver && (
                    <div className="-mt-1 flex justify-end px-3 pb-3">
                      <button
                        type="button"
                        onClick={() => onDeliver(order)}
                        className="min-h-11 rounded-full bg-surface-muted px-4 text-sm font-semibold transition-transform active:scale-95"
                      >
                        Mark delivered
                      </button>
                    </div>
                  )}
                </motion.li>
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
            className="mt-8 flex min-h-11 w-full items-center justify-between text-xl font-extrabold tracking-tight"
          >
            Done today ({done.length})
            <ChevronDown
              aria-hidden
              className={cn("size-6 transition-transform", showDone && "rotate-180")}
            />
          </button>
          {showDone && (
            <ul className="-mx-3 mt-2">
              {done.map((order) => (
                <li key={order.number}>
                  <ListRow
                    art={<Monogram name={order.customer} muted />}
                    tag={
                      order.status === "rejected" ? (
                        <Badge tone="danger">Rejected</Badge>
                      ) : (
                        <Badge tone="success">Delivered</Badge>
                      )
                    }
                    title={order.customer}
                    meta={`#${order.number} · ${order.placedAt}`}
                    trailing={<Amount paise={order.totalPaise} size="md" />}
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

function Stat({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div className="rounded-2xl bg-surface-muted px-3 py-2.5">
      <p className={cn("text-lg leading-tight font-bold tabular-nums", good && "text-success")}>
        {value}
      </p>
      <p className="mt-0.5 text-xs font-medium text-ink-muted">{label}</p>
    </div>
  );
}

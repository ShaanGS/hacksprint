"use client";

import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { OrderCard } from "@/components/owner/order-card";
import { useOwnerLanguage } from "@/components/owner/owner-language";
import { useDay } from "@/components/owner/use-day";
import { Amount } from "@/components/ui/amount";
import { Art } from "@/components/ui/art";
import { Badge } from "@/components/ui/badge";
import type { MicState } from "@/components/ui/hold-mic";
import { ListRow } from "@/components/ui/list-row";
import { Monogram } from "@/components/ui/monogram";
import { cn } from "@/lib/cn";
import { langInfo } from "@/lib/i18n/languages";
import type { OwnerText } from "@/lib/i18n/owner";
import { formatMoney } from "@/lib/money";
import { soft } from "@/lib/motion";
import type { RejectReason } from "@/lib/orders/state";
import type { PaymentMode } from "@/lib/orders/submit";
import type { Takings } from "@/lib/owner/summary";
import type { OwnerOrder } from "@/lib/owner/types";

type Progress = { tag: string; tone: "neutral" | "success" | "danger"; note: string };

/** Where an approved order is, in the owner's words; null once it is done. */
function progressOf(order: OwnerOrder, text: OwnerText): Progress | null {
  switch (order.status) {
    case "awaiting_payment":
      return order.payUrl
        ? { tag: text.linkSent, tone: "neutral", note: text.waitingPayment }
        : { tag: text.linkFailed, tone: "danger", note: text.waitingPayment };
    case "paid":
      return { tag: text.paid, tone: "success", note: text.readyToDeliver };
    case "on_credit":
      return { tag: text.onAccount, tone: "neutral", note: text.readyToDeliver };
    default:
      return null;
  }
}

/**
 * O1: one order in front of the owner at a time, oldest first, with the rest queued under it,
 * so there is only ever one Approve button on screen. Then what is on its way, then what is done.
 */
export function OrdersTab({
  ownerName,
  orders,
  takings,
  mic,
  onHoldStart,
  onHoldEnd,
  onApprove,
  onReject,
  onDeliver,
  onRetryLink,
}: {
  ownerName: string;
  orders: OwnerOrder[];
  takings: Takings;
  mic: MicState;
  onHoldStart: () => void;
  onHoldEnd: (order: OwnerOrder) => void;
  onApprove: (order: OwnerOrder, mode?: PaymentMode) => void;
  onReject: (order: OwnerOrder, reason: RejectReason) => void;
  onDeliver: (order: OwnerOrder) => void;
  onRetryLink: (order: OwnerOrder) => void;
}) {
  const { lang, text } = useOwnerLanguage();
  const day = useDay(text, langInfo[lang].sarvamCode);
  const [focus, setFocus] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);
  const pending = orders
    .filter((o) => o.status === "pending_approval")
    .sort((a, b) => a.number - b.number);
  const next = pending.find((o) => o.id === focus) ?? pending[0];
  const queue = pending.filter((o) => o !== next);
  const onTheWay = orders.filter((o) => progressOf(o, text));
  const done = orders.filter((o) => o.status === "delivered" || o.status === "rejected");

  return (
    <main className="px-4 pt-6 pb-32">
      <p className="h-5 text-sm font-semibold text-ink-muted">{day?.date}</p>
      <h1 className="text-title font-extrabold tracking-tight">
        {day ? `${day.greeting}, ${ownerName}` : ownerName}
      </h1>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Stat label={text.needsYou} value={String(pending.length)} />
        <Stat label={text.collected} value={formatMoney(takings.collectedPaise)} good />
        <Stat label={text.onAccount} value={formatMoney(takings.creditPaise)} />
      </div>

      <h2 className="mt-7 text-xl font-extrabold tracking-tight">{text.needsYou}</h2>
      <div className="mt-3">
        <AnimatePresence mode="popLayout" initial={false}>
          {next ? (
            <motion.div
              key={next.id}
              layout
              initial={{ y: 24, scale: 0.98 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              transition={soft}
            >
              <OrderCard
                order={next}
                mic={mic}
                onHoldStart={onHoldStart}
                onHoldEnd={() => onHoldEnd(next)}
                onApprove={(mode) => onApprove(next, mode)}
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
              <p className="text-base font-medium">{text.caughtUp}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {queue.length > 0 && (
        <ul className="-mx-3 mt-2">
          {queue.map((order) => (
            <li key={order.id}>
              <ListRow
                art={<Monogram name={order.customer} />}
                title={order.customer}
                meta={`#${order.number} · ${order.placedAt} · ${text.items(order.lines.length)}`}
                trailing={<Amount paise={order.totalPaise} size="md" />}
                onClick={() => setFocus(order.id)}
              />
            </li>
          ))}
        </ul>
      )}

      {onTheWay.length > 0 && (
        <>
          <h2 className="mt-8 text-xl font-extrabold tracking-tight">{text.onTheWay}</h2>
          <ul className="-mx-3 mt-2">
            {onTheWay.map((order) => {
              const step = progressOf(order, text);
              const canDeliver = order.status === "paid" || order.status === "on_credit";
              const linkFailed = order.status === "awaiting_payment" && !order.payUrl;
              return (
                <motion.li key={order.id} layout transition={soft}>
                  <ListRow
                    art={<Monogram name={order.customer} />}
                    tag={step && <Badge tone={step.tone}>{step.tag}</Badge>}
                    title={order.customer}
                    meta={`#${order.number} · ${step?.note}`}
                    trailing={<Amount paise={order.totalPaise} size="md" />}
                  />
                  {(canDeliver || linkFailed) && (
                    <div className="-mt-1 flex justify-end px-3 pb-3">
                      <button
                        type="button"
                        onClick={() => (canDeliver ? onDeliver(order) : onRetryLink(order))}
                        className="min-h-11 rounded-full bg-surface-muted px-4 text-sm font-semibold transition-transform active:scale-95"
                      >
                        {canDeliver ? text.markDelivered : text.retryLink}
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
            {text.doneToday(done.length)}
            <ChevronDown
              aria-hidden
              className={cn("size-6 transition-transform", showDone && "rotate-180")}
            />
          </button>
          {showDone && (
            <ul className="-mx-3 mt-2">
              {done.map((order) => (
                <li key={order.id}>
                  <ListRow
                    art={<Monogram name={order.customer} muted />}
                    tag={
                      order.status === "rejected" ? (
                        <Badge tone="danger">{text.rejected}</Badge>
                      ) : (
                        <Badge tone="success">{text.delivered}</Badge>
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

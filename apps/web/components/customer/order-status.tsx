"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { Amount } from "@/components/ui/amount";
import { Art, toArtName, type ArtName } from "@/components/ui/art";
import { ArtStack } from "@/components/ui/art-stack";
import { Button } from "@/components/ui/button";
import { Steps, type Step } from "@/components/ui/steps";
import { cn } from "@/lib/cn";
import type { CustomerBackend, OrderView } from "@/lib/customer/backend";
import type { Lang } from "@/lib/i18n/languages";
import { textFor, type CustomerText } from "@/lib/i18n/text";
import { formatMoney } from "@/lib/money";
import { soft } from "@/lib/motion";

// The shop's decision shows up within one poll; 2 s is the spec's target.
const POLL_MS = 2000;

type Stage = { art: ArtName; tint: string; title: string; line: string | null; grey?: boolean };

/** The hero for each moment of the order: its picture, its colour and what it means. */
function stageOf(view: OrderView, t: CustomerText, shopName: string): Stage {
  switch (view.status) {
    case "pending_approval":
      return { art: "clock", tint: "bg-tint-sand", title: t.waiting, line: shopName };
    case "awaiting_payment":
      return view.confirming
        ? { art: "phone-pay", tint: "bg-tint-sky", title: t.confirming, line: null }
        : { art: "phone-pay", tint: "bg-tint-sky", title: t.statusApproved, line: shopName };
    case "paid":
      return { art: "savings", tint: "bg-tint-mint", title: t.statusPaid, line: shopName };
    case "on_credit":
      return {
        art: "khata",
        tint: "bg-tint-lilac",
        title: t.statusOnAccount,
        line: view.balancePaise === null ? null : t.owe(formatMoney(view.balancePaise)),
      };
    case "delivered":
      return { art: "scooter", tint: "bg-tint-mint", title: t.statusDelivered, line: shopName };
    case "rejected":
      return {
        art: "bag",
        tint: "bg-tint-sand",
        title: t.rejectedTitle,
        line: view.rejectReason ? t.reasons[view.rejectReason] : null,
        grey: true,
      };
  }
}

function stepsOf(view: OrderView, t: CustomerText): Step[] {
  const approved = view.status !== "pending_approval";
  const settled = ["paid", "on_credit", "delivered"].includes(view.status);
  const delivered = view.status === "delivered";
  const state = (done: boolean, current: boolean): Step["state"] =>
    done ? "done" : current ? "current" : "todo";
  return [
    { title: t.statusSent, meta: t.items(view.itemCount), state: "done", art: "bag" },
    { title: t.statusApproved, state: state(approved, !approved), art: "shop" },
    view.paymentMode === "credit"
      ? { title: t.statusOnAccount, state: state(settled, approved && !settled), art: "khata" }
      : { title: t.statusPaid, state: state(settled, approved && !settled), art: "coins" },
    { title: t.statusDelivered, state: state(delivered, settled && !delivered), art: "scooter" },
  ];
}

/** C2: where the order is, step by step, and the one thing the customer can do next. */
export function OrderStatus({
  lang,
  shopName,
  backend,
  number,
  onOrderAgain,
}: {
  lang: Lang;
  shopName: string;
  backend: CustomerBackend;
  number: number;
  onOrderAgain: () => void;
}) {
  const t = textFor(lang);
  const [view, setView] = useState<OrderView | null>(null);

  useEffect(() => {
    let current = true;
    const load = () =>
      backend.order(number).then(
        (next) => {
          if (current) setView(next);
        },
        () => undefined,
      );
    load();
    const timer = setInterval(load, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      current = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [backend, number]);

  if (!view) {
    return (
      <main lang={lang} className="grid h-full place-items-center px-4">
        <Art name="clock" size={120} eager />
      </main>
    );
  }

  const stage = stageOf(view, t, shopName);
  const canPay = view.status === "awaiting_payment" && !view.confirming;
  const finished = ["paid", "on_credit", "delivered", "rejected"].includes(view.status);
  return (
    <main lang={lang} className="pb-safe flex min-h-full flex-col px-4 pt-4">
      <section
        className={cn(
          "overflow-hidden rounded-3xl px-5 pt-3 pb-5 transition-colors duration-500",
          stage.tint,
        )}
      >
        <div className="flex h-36 items-center justify-center">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={stage.art}
              initial={{ scale: 0.6, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={soft}
            >
              <Art
                name={stage.art}
                size={136}
                eager
                className={cn(stage.grey && "opacity-60 grayscale")}
              />
            </motion.div>
          </AnimatePresence>
        </div>
        <p className="mt-2 text-sm font-semibold text-ink-muted">{t.orderNumber(view.number)}</p>
        <h1 className="mt-0.5 text-title font-extrabold tracking-tight">{stage.title}</h1>
        {stage.line && <p className="mt-1 text-base text-ink-muted">{stage.line}</p>}
      </section>

      {view.status !== "rejected" && (
        <div className="mt-6">
          <Steps steps={stepsOf(view, t)} />
        </div>
      )}

      <div className="mt-5 flex items-center gap-3 rounded-2xl bg-surface-muted p-3 pr-4">
        <ArtStack names={view.arts.map(toArtName)} size={40} />
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold">{t.items(view.itemCount)}</p>
          <p className="truncate text-sm text-ink-muted">
            {view.paymentMode === "credit" ? t.onAccount : t.payByLink}
          </p>
        </div>
        <Amount paise={view.totalPaise} size="lg" />
      </div>

      <div className="mt-auto pt-6">
        {canPay && (
          <Button wide onClick={() => backend.pay(view.number)}>
            {t.pay(formatMoney(view.totalPaise))}
          </Button>
        )}
        {finished && (
          <Button
            wide
            variant={view.status === "rejected" ? "primary" : "soft"}
            onClick={onOrderAgain}
          >
            {t.orderAgain}
          </Button>
        )}
      </div>
    </main>
  );
}

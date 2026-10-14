"use client";

import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { Amount } from "@/components/ui/amount";
import { Art } from "@/components/ui/art";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ListRow } from "@/components/ui/list-row";
import { cn } from "@/lib/cn";
import type { CustomerBackend, OrderView } from "@/lib/customer/backend";
import type { Lang } from "@/lib/i18n/languages";
import { textFor } from "@/lib/i18n/text";
import { formatMoney } from "@/lib/money";

// The shop's decision shows up within one poll; 2 s is the spec's target.
const POLL_MS = 2000;

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
        <p className="text-lg text-ink-muted">{t.thinking}</p>
      </main>
    );
  }

  const approved = view.status !== "pending_approval" && view.status !== "rejected";
  const settled = ["paid", "on_credit", "delivered"].includes(view.status);
  const steps = [
    { title: t.statusSent, meta: t.items(view.itemCount), done: true },
    { title: t.statusApproved, meta: approved ? null : t.waiting, done: approved },
    view.paymentMode === "credit"
      ? {
          title: t.statusOnAccount,
          meta: view.balancePaise === null ? null : t.owe(formatMoney(view.balancePaise)),
          done: settled,
        }
      : { title: t.statusPaid, meta: view.confirming ? t.confirming : null, done: settled },
    { title: t.statusDelivered, meta: null, done: view.status === "delivered" },
  ];
  const canPay = view.status === "awaiting_payment" && !view.confirming;
  const finished = settled || view.status === "rejected";

  return (
    <main lang={lang} className="flex min-h-full flex-col px-4 pt-10 pb-6">
      <h1 className="text-center text-display font-bold">{t.orderNumber(view.number)}</h1>
      <p className="mt-1 text-center text-lg text-ink-muted">{shopName}</p>

      {view.status === "rejected" ? (
        <Card className="mt-8">
          <p className="text-lg font-bold">{t.rejectedTitle}</p>
          {view.rejectReason && (
            <p className="mt-1 text-base text-ink-muted">{t.reasons[view.rejectReason]}</p>
          )}
        </Card>
      ) : (
        <ol className="mt-8">
          {steps.map((step, index) => (
            <li key={step.title} className="flex gap-4">
              <div className="flex flex-col items-center">
                <span
                  className={cn(
                    "grid size-9 shrink-0 place-items-center rounded-full",
                    step.done ? "bg-accent text-accent-ink" : "border-2 border-surface-pressed",
                  )}
                >
                  {step.done && <Check aria-hidden className="size-5" />}
                </span>
                {index < steps.length - 1 && (
                  <span
                    aria-hidden
                    className={cn("w-0.5 flex-1", step.done ? "bg-ink" : "bg-surface-pressed")}
                  />
                )}
              </div>
              <div className="min-h-16 pb-6">
                <p className={cn("text-lg font-medium", !step.done && "text-ink-muted")}>
                  {step.title}
                </p>
                {step.meta && <p className="text-base text-ink-muted">{step.meta}</p>}
              </div>
            </li>
          ))}
        </ol>
      )}

      <div className="mt-2">
        <ListRow
          art={<Art name="bag" />}
          title={t.items(view.itemCount)}
          meta={view.paymentMode === "credit" ? t.onAccount : t.payByLink}
          trailing={<Amount paise={view.totalPaise} />}
          selected
        />
      </div>

      <div className="mt-auto pt-8">
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

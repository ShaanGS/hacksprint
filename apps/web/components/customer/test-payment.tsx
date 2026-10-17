"use client";

import { Check } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { Amount } from "@/components/ui/amount";
import { Art } from "@/components/ui/art";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { snappy } from "@/lib/motion";
import type { PaymentView } from "@/lib/payments/view";

/** The test payment page: one amount, one button, and a clear tick when it is paid. */
export function TestPayment({ payment, shopName }: { payment: PaymentView; shopName: string }) {
  const [paid, setPaid] = useState(payment.paid);
  const [paying, setPaying] = useState(false);
  const [failed, setFailed] = useState(false);

  async function pay() {
    setPaying(true);
    setFailed(false);
    const response = await fetch(`/api/pay/${payment.id}`, { method: "POST" }).catch(() => null);
    setPaying(false);
    if (response?.ok) setPaid(true);
    else setFailed(true);
  }

  return (
    <main className="pb-safe flex min-h-full flex-col px-4 pt-8">
      <Badge>Test payment</Badge>
      <section className="mt-4 rounded-3xl bg-tint-sky p-5 text-center">
        <div className="flex h-36 items-center justify-center">
          {paid ? (
            <motion.span
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              transition={snappy}
              className="grid size-28 place-items-center rounded-full bg-success text-accent-ink"
            >
              <Check aria-hidden className="size-14" strokeWidth={3} />
            </motion.span>
          ) : (
            <Art name="phone-pay" size={136} eager />
          )}
        </div>
        <p className="mt-2 text-sm font-semibold text-ink-muted">
          {shopName} · Order #{payment.orderNumber}
        </p>
        <Amount paise={payment.amountPaise} size="hero" className="mt-1 block" />
        <p className="mt-1 text-base text-ink-muted">
          {paid
            ? "Paid. You can close this tab."
            : "This page stands in for Paytm until its keys are in."}
        </p>
      </section>
      <div className="mt-auto pt-8">
        {failed && (
          <p role="alert" className="mb-3 text-center text-sm font-medium text-danger">
            That did not go through. Try again.
          </p>
        )}
        {!paid && (
          <Button wide disabled={paying} onClick={pay}>
            {paying ? "Paying" : "Pay now"}
          </Button>
        )}
      </div>
    </main>
  );
}

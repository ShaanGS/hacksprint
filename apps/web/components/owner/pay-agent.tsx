"use client";

import { useEffect, useState } from "react";
import { useOwnerLanguage } from "@/components/owner/owner-language";
import { useOwnerScreen } from "@/components/owner/owner-screen";
import { PaidBillRow, PayBillCard } from "@/components/owner/pay-bill-card";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { Steps, type Step } from "@/components/ui/steps";
import { billPayWordsFor } from "@/lib/i18n/bill-pay";
import { formatMoney } from "@/lib/money";
import { billPayApi, type BillPayRun } from "@/lib/owner/bill-pay-api";

/**
 * The bill-pay agent (decision of Oct 18): inside the limit the owner set, it decides pay or hold
 * for each bill and why, and prepares each payment for his own UPI app. Nothing is paid until he
 * pays there and taps "I paid it" (rule 3); the money never passes through us (rule 8).
 */
export function PayAgent({
  open,
  onClose,
  onSetLimit,
}: {
  open: boolean;
  onClose: () => void;
  /** Takes the owner to where he sets the limit (the Bank tab). */
  onSetLimit?: () => void;
}) {
  const { lang, text } = useOwnerLanguage();
  return (
    <Sheet
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title={billPayWordsFor(lang).title}
      tone="night"
      footer={
        <div className="pb-3">
          <Button wide variant="night" onClick={onClose}>
            {text.done}
          </Button>
        </div>
      }
    >
      {open && <Paying onSetLimit={onSetLimit} />}
    </Sheet>
  );
}

function Paying({ onSetLimit }: { onSetLimit?: () => void }) {
  const { lang, text } = useOwnerLanguage();
  const { notify } = useOwnerScreen();
  const words = billPayWordsFor(lang);
  const [run, setRun] = useState<BillPayRun | null>(null);
  // Each look is a fresh run: after a payment the rules decide again from the numbers as they are.
  const [looks, setLooks] = useState(0);

  useEffect(() => {
    let current = true;
    billPayApi.run().then(
      (next) => current && setRun(next),
      () => current && notify(text.failed),
    );
    return () => {
      current = false;
    };
  }, [looks, notify, text.failed]);

  const mandate = run?.mandate ?? null;
  const decisions = run?.decisions ?? [];
  const toPay = decisions.filter((d) => d.decision === "pay").length;
  const ready = run !== null && mandate !== null;
  const steps: Step[] = [
    {
      title: words.steps.due,
      meta: !run
        ? null
        : decisions.length > 0
          ? words.billsMeta(decisions.length, formatMoney(run.bills_total_paise))
          : words.noBills,
      state: run ? "done" : "current",
    },
    {
      title: words.steps.limit,
      meta: !run
        ? null
        : mandate
          ? words.limitMeta(
              formatMoney(mandate.weekly_limit_paise),
              formatMoney(run.limit_left_paise),
              toPay > 0,
            )
          : words.noLimit,
      state: ready ? "done" : run ? "current" : "todo",
    },
    {
      title: words.steps.inHand,
      meta: ready
        ? words.inHandMeta(
            formatMoney(run.money_in_hand_paise),
            formatMoney(run.keep_in_hand_paise),
          )
        : null,
      state: ready ? "done" : "todo",
    },
    {
      title: words.steps.decided,
      meta: ready
        ? words.decidedMeta(toPay, decisions.length - toPay, formatMoney(run.in_hand_after_paise))
        : null,
      state: ready ? "done" : "todo",
    },
  ];
  const shown =
    run && decisions.length === 0 ? steps.slice(0, 1) : run && !mandate ? steps.slice(0, 2) : steps;

  return (
    <div className="space-y-5">
      <Steps tone="night" steps={shown} />
      {run && !mandate && decisions.length > 0 && (
        <section className="space-y-3 rounded-3xl bg-night-raised p-4">
          <p className="text-base">{words.setLimitFirst}</p>
          {onSetLimit && (
            <Button wide variant="yellow" onClick={onSetLimit}>
              {words.setLimit}
            </Button>
          )}
        </section>
      )}
      {run && run.paid_this_week.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-night-muted">{words.paidThisWeek}</h3>
          <ul className="mt-1 divide-y divide-night-raised rounded-3xl bg-night-raised/40 px-3">
            {run.paid_this_week.map((paid) => (
              <PaidBillRow key={paid.payable_id} paid={paid} />
            ))}
          </ul>
        </section>
      )}
      {ready &&
        decisions.map((decision) => (
          <PayBillCard
            key={decision.payable_id}
            decision={decision}
            run={run}
            onChanged={() => setLooks((count) => count + 1)}
          />
        ))}
      {ready && toPay > 0 && <p className="text-sm text-night-muted">{words.ownApp}</p>}
    </div>
  );
}

"use client";

import { ShieldCheck, ShieldX } from "lucide-react";
import { useOwnerLanguage } from "@/components/owner/owner-language";
import { billPayWordsFor } from "@/lib/i18n/bill-pay";
import { guardrailWordsFor } from "@/lib/i18n/guardrails";
import { formatMoney } from "@/lib/money";
import type { PlanResult } from "@/lib/owner/planner-api";
import type { BillDecision } from "@/lib/rotation/mandate";

const billReasons: readonly string[] = [
  "within_limit",
  "over_limit",
  "not_enough_in_hand",
  "no_upi_id",
  "not_due_yet",
  "festival_order",
  "no_mandate",
] satisfies BillDecision["reason"][];
const isBillReason = (reason: string): reason is BillDecision["reason"] =>
  billReasons.includes(reason);

/**
 * What the guardrails did to this plan: each step they stopped, with the reason in plain words
 * (a held bill shows the numbers code worked out), and each thing code fixed.
 */
export function PlanGuardrails({ plan }: { plan: PlanResult }) {
  const { lang } = useOwnerLanguage();
  const words = guardrailWordsFor(lang);
  const billWords = billPayWordsFor(lang);
  if (plan.dropped.length === 0 && plan.fixed.length === 0) return null;
  return (
    <section className="mt-5 rounded-3xl bg-night-raised/40 p-4">
      {plan.dropped.length > 0 && (
        <>
          <h3 className="flex items-center gap-2 font-semibold">
            <ShieldX aria-hidden className="size-5 text-yellow" />
            {words.stoppedTitle}
          </h3>
          <ul className="mt-2 space-y-2 text-sm">
            {plan.dropped.map((stopped, index) => (
              <li key={`${stopped.why}-${index}`}>
                <p>{words.why[stopped.why]}</p>
                {stopped.held.map((bill) => (
                  <p key={bill.distributor} className="text-night-muted">
                    {`${bill.distributor}, ${formatMoney(bill.amount_paise)}`}
                    {isBillReason(bill.reason) &&
                      `: ${billWords.reason({
                        reason: bill.reason,
                        keep: formatMoney(bill.keep_paise),
                        needsMore: formatMoney(bill.needs_more_paise),
                        dueInDays: bill.due_in_days,
                        festival: bill.festival,
                      })}`}
                  </p>
                ))}
              </li>
            ))}
          </ul>
        </>
      )}
      {plan.fixed.length > 0 && (
        <ul
          className={`space-y-1 text-sm text-night-muted ${plan.dropped.length > 0 ? "mt-3" : ""}`}
        >
          {plan.fixed.map((fixed) => (
            <li key={fixed.what} className="flex items-start gap-2">
              <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-yellow" />
              {words.fix[fixed.what](fixed.count)}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

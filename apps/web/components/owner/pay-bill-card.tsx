"use client";

import { Check, Smartphone } from "lucide-react";
import { useState } from "react";
import { useOwnerLanguage } from "@/components/owner/owner-language";
import { useOwnerScreen } from "@/components/owner/owner-screen";
import { SourceBadge } from "@/components/owner/source-badge";
import { UpiStandIn } from "@/components/owner/upi-stand-in";
import { useDates } from "@/components/owner/use-dates";
import { Amount } from "@/components/ui/amount";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { billPayWordsFor } from "@/lib/i18n/bill-pay";
import { formatMoney } from "@/lib/money";
import { billPayApi, type BillPayDecision, type BillPayRun } from "@/lib/owner/bill-pay-api";
import { RequestError } from "@/lib/owner/fetch";

/**
 * One bill as the bill-pay agent decided it: pay or hold, and why. A bill to pay opens the owner's
 * own UPI app (in the demo, a stand-in that moves no money); it counts as paid only when he taps
 * "I paid it", and then the agent decides the rest again.
 */
export function PayBillCard({
  decision,
  run,
  onChanged,
}: {
  decision: BillPayDecision;
  run: BillPayRun;
  onChanged: () => void;
}) {
  const { lang, text } = useOwnerLanguage();
  const { demo, notify } = useOwnerScreen();
  const dates = useDates();
  const words = billPayWordsFor(lang);
  const [opened, setOpened] = useState(false);
  const [standIn, setStandIn] = useState(false);
  const [busy, setBusy] = useState(false);
  // Paid shows at once; the next run then lists the bill under what was paid this week.
  const [done, setDone] = useState(false);
  const pay = decision.decision === "pay";
  const upiUrl = decision.upi_url;

  function openUpi() {
    if (demo) setStandIn(true);
    else if (upiUrl) {
      window.location.assign(upiUrl);
      setOpened(true);
    }
  }

  async function paid() {
    setBusy(true);
    try {
      await billPayApi.paid(decision.payable_id, run.run_id);
      setDone(true);
      setStandIn(false);
      notify(words.paidLine(formatMoney(decision.amount_paise)));
      onChanged();
    } catch (error) {
      const changed = error instanceof RequestError && error.status === 409;
      notify(changed ? words.noLonger : text.failed);
      if (changed) onChanged();
    } finally {
      setBusy(false);
    }
  }

  const reason = words.reason({
    reason: decision.reason,
    keep: formatMoney(run.keep_in_hand_paise),
    needsMore: formatMoney(decision.needs_more_paise),
    dueInDays: decision.due_in_days,
    festival: run.festival,
  });
  return (
    <section className="rounded-3xl bg-night-raised p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-lg font-bold">{decision.distributor}</p>
          <p className="text-sm text-night-muted">
            {[
              decision.bill_number,
              decision.overdue_days > 0
                ? text.overdueBy(decision.overdue_days)
                : text.dueOn(dates.day(decision.due_date)),
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Amount paise={decision.amount_paise} size="md" />
          {done ? (
            <PaidTick />
          ) : (
            <Badge tone={pay ? "yellow" : "night"}>
              {pay ? words.badge.pay : words.badge.hold}
            </Badge>
          )}
        </div>
      </div>
      <p className="mt-2 text-base">
        {done ? words.paidLine(formatMoney(decision.amount_paise)) : reason}
      </p>
      {pay && !done && (
        <div className="mt-3 space-y-2">
          <Button wide variant={opened ? "night" : "yellow"} disabled={busy} onClick={openUpi}>
            <Smartphone aria-hidden className="size-5" />
            {words.payWithUpi(formatMoney(decision.amount_paise))}
          </Button>
          {opened && (
            <>
              <p className="text-sm text-night-muted">{words.afterPaying}</p>
              <Button wide variant="yellow" disabled={busy} onClick={paid}>
                <Check aria-hidden className="size-5" strokeWidth={3} />
                {words.iPaid}
              </Button>
            </>
          )}
        </div>
      )}
      {pay && demo && (
        <UpiStandIn
          open={standIn}
          decision={decision}
          busy={busy}
          onClose={() => setStandIn(false)}
          onPaid={paid}
        />
      )}
    </section>
  );
}

/** A bill paid inside the limit this week, with a green tick and his word as its source. */
export function PaidBillRow({ paid }: { paid: BillPayRun["paid_this_week"][number] }) {
  const { lang } = useOwnerLanguage();
  const words = billPayWordsFor(lang);
  return (
    <li className="flex items-center gap-3 py-3">
      <PaidTick />
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-bold">
          {[paid.distributor, paid.bill_number].filter(Boolean).join(" · ")}
        </p>
        <p className="text-sm text-night-muted">{words.paidLine(formatMoney(paid.amount_paise))}</p>
      </div>
      <SourceBadge label={paid.label} />
    </li>
  );
}

/** Paid: a white tick on green, the one colour kept for money paid or collected. */
function PaidTick() {
  return (
    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-success text-accent-ink">
      <Check aria-hidden className="size-5" strokeWidth={3} />
    </span>
  );
}

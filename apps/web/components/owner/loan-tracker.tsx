"use client";

import { Landmark, PiggyBank } from "lucide-react";
import { useState } from "react";
import { useLive } from "@/components/owner/live";
import { LoanSanctionSheet } from "@/components/owner/loan-sanction";
import { useOwnerLanguage } from "@/components/owner/owner-language";
import { useOwnerScreen } from "@/components/owner/owner-screen";
import { useDates } from "@/components/owner/use-dates";
import { Amount } from "@/components/ui/amount";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconCircle } from "@/components/ui/icon-circle";
import { Steps, type Step } from "@/components/ui/steps";
import { loanTrackerWordsFor } from "@/lib/i18n/loan-tracker";
import { SET_ASIDE_DAYS } from "@/lib/loans/track";
import { formatMoney } from "@/lib/money";
import { ownerApi, type LoanSanction, type LoanStatus, type LoanTracker } from "@/lib/owner/api";

type Loan = NonNullable<LoanTracker["loan"]>;
type NextEmi = NonNullable<Loan["next_emi"]>;

const path: LoanStatus[] = ["applied", "docs_asked", "sanctioned", "disbursed"];

/**
 * The loan tracker: after the loan check, he taps each step the bank takes; once the money is
 * in, the next EMI and what to keep aside tonight. Plain code on his own word; we move no money.
 */
export function LoanTrackerCard() {
  const { lang, text } = useOwnerLanguage();
  const words = loanTrackerWordsFor(lang);
  const { notify } = useOwnerScreen();
  const dates = useDates();
  const tracker = useLive(ownerApi.loanTracker, ["rotation"]);
  const [sanctioning, setSanctioning] = useState(false);
  const [busy, setBusy] = useState(false);

  async function run(work: () => Promise<unknown>) {
    setBusy(true);
    try {
      await work();
      tracker.reload();
      return true;
    } catch {
      notify(text.failed);
      return false;
    } finally {
      setBusy(false);
    }
  }

  const loan = tracker.data?.loan;
  if (!loan) return null;
  const move = (to: LoanStatus, sanction?: LoanSanction) =>
    run(() => ownerApi.moveLoan(loan.id, to, sanction));

  return (
    <section className="mt-4 rounded-3xl bg-surface p-4 shadow-card">
      <div className="flex items-start gap-3">
        <IconCircle icon={Landmark} tone="sky" size="lg" />
        <div className="min-w-0 flex-1">
          <p className="text-lg font-bold">{words.title}</p>
          <Amount paise={loan.sanctioned_paise ?? loan.loan_needed_paise} size="md" />
        </div>
        <Badge>{words.ownWord}</Badge>
      </div>

      <div className="mt-4">
        <Steps steps={stepsOf(loan, words.steps, dates.day, words.stepOn)} />
      </div>
      {loan.status === "rejected" && <p className="mt-3 text-base">{words.rejectedLine}</p>}

      {loan.status === "disbursed" && loan.emis && (
        <div className="mt-4 space-y-3">
          <p className="text-sm font-semibold text-ink-muted">
            {words.emisPaid(loan.emis.paid, loan.emis.total)}
          </p>
          {loan.next_emi ? (
            <EmiBlock
              emi={loan.next_emi}
              busy={busy}
              onKept={(id, paise) => run(() => ownerApi.keepAside(id, paise))}
            />
          ) : (
            <p className="text-base font-semibold">{words.allPaid}</p>
          )}
        </div>
      )}

      {loan.next_steps.length > 0 && (
        <div className="mt-4 space-y-2">
          {loan.next_steps.map((to) => (
            <Button
              key={to}
              wide
              variant={to === "rejected" ? "ghost" : to === loan.next_steps[0] ? "primary" : "soft"}
              disabled={busy}
              onClick={() => (to === "sanctioned" ? setSanctioning(true) : move(to))}
            >
              {words.tap[to]}
            </Button>
          ))}
        </div>
      )}

      <LoanSanctionSheet
        open={sanctioning}
        loanNeededPaise={loan.loan_needed_paise}
        busy={busy}
        onClose={() => setSanctioning(false)}
        onSave={async (sanction) => {
          if (await move("sanctioned", sanction)) setSanctioning(false);
        }}
      />
    </section>
  );
}

function stepsOf(
  loan: Loan,
  names: Record<LoanStatus, string>,
  day: (iso: string) => string,
  stepOn: (date: string) => string,
): Step[] {
  const reached = new Map(loan.steps.map((s) => [s.status, s.at]));
  // The documents step shows only if the bank asked, or while it still might.
  const shown = path.filter(
    (status) => status !== "docs_asked" || reached.has(status) || loan.status === "applied",
  );
  const steps: Step[] = shown
    .filter((status) => loan.status !== "rejected" || reached.has(status))
    .map((status) => {
      const at = reached.get(status);
      return {
        title: names[status],
        meta: at ? stepOn(day(at)) : null,
        state: at ? "done" : "todo",
      };
    });
  const firstTodo = steps.findIndex((s) => s.state === "todo");
  if (firstTodo >= 0) steps[firstTodo] = { ...steps[firstTodo], state: "current" };
  const rejectedAt = reached.get("rejected");
  if (rejectedAt)
    steps.push({ title: names.rejected, meta: stepOn(day(rejectedAt)), state: "current" });
  return steps;
}

function EmiBlock({
  emi,
  busy,
  onKept,
}: {
  emi: NextEmi;
  busy: boolean;
  onKept: (payableId: string, paise: number) => void;
}) {
  const { lang } = useOwnerLanguage();
  const words = loanTrackerWordsFor(lang);
  const dates = useDates();
  return (
    <div className="space-y-3 rounded-2xl bg-surface-muted p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-base font-bold">
          {words.nextEmi(formatMoney(emi.amount_paise), dates.day(emi.due_date))}
        </p>
        {emi.overdue_days > 0 && <Badge tone="danger">{words.overdue(emi.overdue_days)}</Badge>}
      </div>
      <p className="text-sm text-ink-muted">
        {words.kept(formatMoney(emi.kept_paise), formatMoney(emi.amount_paise))}
      </p>
      {emi.remaining_paise === 0 ? (
        <p className="text-base font-semibold">{words.allKept}</p>
      ) : emi.started ? (
        <>
          <div className="flex items-center gap-3">
            <IconCircle icon={PiggyBank} tone="sand" />
            <p className="text-lg font-extrabold">
              {words.tonight(formatMoney(emi.tonight_paise))}
            </p>
          </div>
          <p className="text-sm text-ink-muted">{words.tonightHint}</p>
          <Button wide disabled={busy} onClick={() => onKept(emi.payable_id, emi.tonight_paise)}>
            {words.keptIt}
          </Button>
        </>
      ) : (
        <p className="text-sm text-ink-muted">{words.startsLater(SET_ASIDE_DAYS)}</p>
      )}
    </div>
  );
}

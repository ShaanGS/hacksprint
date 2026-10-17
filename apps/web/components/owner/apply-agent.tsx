"use client";

import { useEffect, useState } from "react";
import { useOwnerLanguage } from "@/components/owner/owner-language";
import { useOwnerScreen } from "@/components/owner/owner-screen";
import { Art } from "@/components/ui/art";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { Steps, type Step } from "@/components/ui/steps";
import { paperTextFor } from "@/lib/i18n/paper";
import { formatMoney } from "@/lib/money";
import { ownerApi, type Application } from "@/lib/owner/api";
import { schemeWords } from "@/lib/schemes/catalog";

// Long enough to read each step as it ticks, short enough for a stage.
const STEP_MS = 1100;
const STEP_COUNT = 5;

/**
 * The apply agent (demo only): fills the loan application from his records, one step at a
 * time, and stops where his own Aadhaar OTP would be needed. A simulation; nothing is sent.
 */
export function ApplyAgent({
  loanRequestId,
  onClose,
}: {
  loanRequestId: string | null;
  onClose: () => void;
}) {
  const { lang, text } = useOwnerLanguage();
  const { notify } = useOwnerScreen();
  const [draft, setDraft] = useState<Application | null>(null);
  const [done, setDone] = useState(0);

  useEffect(() => {
    if (!loanRequestId) return;
    let current = true;
    const timers: ReturnType<typeof setTimeout>[] = [];
    ownerApi.applyAgent(loanRequestId).then(
      (next) => {
        if (!current) return;
        setDraft(next);
        for (let step = 1; step <= STEP_COUNT; step += 1) {
          timers.push(setTimeout(() => setDone(step), STEP_MS * step));
        }
      },
      () => {
        if (!current) return;
        notify(text.failed);
        onClose();
      },
    );
    return () => {
      current = false;
      timers.forEach(clearTimeout);
      setDraft(null);
      setDone(0);
    };
  }, [loanRequestId, notify, onClose, text.failed]);

  const words = schemeWords(lang === "ta" ? "ta" : "en");
  const paper = paperTextFor(lang === "ta" ? "ta" : "en");
  const steps: Step[] = draft
    ? [
        {
          title: text.agentSteps.read,
          meta: text.agentRead(
            draft.months,
            formatMoney(draft.monthly_sales.verified_paise),
            formatMoney(draft.monthly_sales.declared_paise),
            draft.bills_paid_on_time,
          ),
        },
        {
          title: text.agentSteps.scheme,
          meta: draft.band
            ? `${words.mudraName}: ${words.band(draft.band).name}, ${words.band(draft.band).range}. ${words.noCollateral}`
            : words.mudraName,
        },
        { title: text.agentSteps.fill, meta: text.agentFilled(formatMoney(draft.loan_paise)) },
        {
          title: text.agentSteps.documents,
          meta: text.agentDocuments(
            draft.documents.filter((d) => d.status === "have").map((d) => paper.checklist[d.key]),
            draft.documents
              .filter((d) => d.status === "missing")
              .map((d) => paper.checklist[d.key]),
          ),
        },
        { title: text.agentSteps.submit, meta: text.agentWaiting },
      ].map((step, index) => ({
        ...step,
        state: index < done ? "done" : index === done ? "current" : "todo",
        meta: index <= done ? step.meta : null,
      }))
    : [];

  return (
    <Sheet
      open={loanRequestId !== null}
      onOpenChange={(open) => !open && onClose()}
      title={text.agentTitle}
      tone="night"
      footer={
        <div className="pb-3">
          <Button wide variant={done >= STEP_COUNT ? "yellow" : "night"} onClick={onClose}>
            {text.done}
          </Button>
        </div>
      }
    >
      {!draft ? (
        <div className="grid h-40 place-items-center">
          <Art name="bill" size={96} className="animate-pulse motion-reduce:animate-none" />
        </div>
      ) : (
        <div className="space-y-5">
          <Steps tone="night" steps={steps} />
          {done >= 3 && (
            <dl className="space-y-2 rounded-3xl bg-night-raised p-4 text-base">
              <Field label={text.agentFields.shop} value={draft.shop} />
              <Field label={text.agentFields.applicant} value={draft.owner} />
              <Field label={text.agentFields.amount} value={formatMoney(draft.loan_paise)} />
              <Field label={text.agentFields.purpose} value={words.loanForm(draft.purpose).line} />
              <Field
                label={text.agentFields.sales}
                value={formatMoney(
                  draft.monthly_sales.verified_paise + draft.monthly_sales.declared_paise,
                )}
              />
            </dl>
          )}
          {done >= STEP_COUNT && (
            <p className="rounded-3xl border border-night-raised p-4 text-base font-semibold">
              {text.agentSimulated}
            </p>
          )}
        </div>
      )}
    </Sheet>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm text-night-muted">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}

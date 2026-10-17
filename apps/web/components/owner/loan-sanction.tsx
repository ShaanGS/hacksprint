"use client";

import { useState } from "react";
import { useOwnerLanguage } from "@/components/owner/owner-language";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Sheet } from "@/components/ui/sheet";
import { loanTrackerWordsFor } from "@/lib/i18n/loan-tracker";
import type { LoanSanction } from "@/lib/owner/api";

const MONTHS = [12, 24, 36, 60] as const;

/** What the bank sanctioned, as he read it off the letter: amount, EMI and months. */
export function LoanSanctionSheet({
  open,
  loanNeededPaise,
  busy,
  onClose,
  onSave,
}: {
  open: boolean;
  loanNeededPaise: number;
  busy: boolean;
  onClose: () => void;
  onSave: (sanction: LoanSanction) => void;
}) {
  const { lang } = useOwnerLanguage();
  const words = loanTrackerWordsFor(lang);
  const [amount, setAmount] = useState(String(Math.round(loanNeededPaise / 100)));
  const [emi, setEmi] = useState("");
  const [months, setMonths] = useState<number>(12);
  const rupees = (value: string) => Math.round(Number(value) * 100) || 0;
  const ready = rupees(amount) > 0 && rupees(emi) > 0;

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title={words.sanctionTitle}
      footer={
        <div className="pb-3">
          <Button
            wide
            disabled={!ready || busy}
            onClick={() =>
              onSave({
                sanctioned_paise: rupees(amount),
                emi_paise: rupees(emi),
                tenure_months: months,
              })
            }
          >
            {words.save}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Field label={words.sanctionedAmount} value={amount} onChange={setAmount} />
        <Field label={words.emiAmount} value={emi} onChange={setEmi} />
        <div>
          <p className="text-sm font-semibold text-ink-muted">{words.months}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {MONTHS.map((option) => (
              <Chip key={option} on={months === option} onClick={() => setMonths(option)}>
                {words.monthsOption(option)}
              </Chip>
            ))}
          </div>
        </div>
      </div>
    </Sheet>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block rounded-2xl bg-surface-muted p-3 text-sm font-medium text-ink-muted">
      {label}
      <input
        inputMode="numeric"
        value={value}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, ""))}
        className="mt-1 block w-full bg-transparent text-xl font-extrabold text-ink outline-none"
      />
    </label>
  );
}

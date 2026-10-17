"use client";

import { Camera, LoaderCircle } from "lucide-react";
import { useRef, useState, type ChangeEvent } from "react";
import { useOwnerLanguage } from "@/components/owner/owner-language";
import { useOwnerScreen } from "@/components/owner/owner-screen";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Sheet } from "@/components/ui/sheet";
import { shrinkPhoto } from "@/lib/bills/photo";
import { loanTrackerWordsFor } from "@/lib/i18n/loan-tracker";
import { ownerApi, type LoanSanction } from "@/lib/owner/api";

const MONTHS = [12, 24, 36, 60];

/**
 * What the bank sanctioned: amount, EMI and months. A photo of the letter fills them in (Vertex
 * AI or Gemini reads the printed figures); he checks each one and taps Save.
 */
export function LoanSanctionSheet({
  open,
  loanId,
  loanNeededPaise,
  busy,
  onClose,
  onSave,
}: {
  open: boolean;
  loanId: string;
  loanNeededPaise: number;
  busy: boolean;
  onClose: () => void;
  onSave: (sanction: LoanSanction) => void;
}) {
  const { lang, text } = useOwnerLanguage();
  const { notify } = useOwnerScreen();
  const camera = useRef<HTMLInputElement>(null);
  const [reading, setReading] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const words = loanTrackerWordsFor(lang);
  const [amount, setAmount] = useState(String(Math.round(loanNeededPaise / 100)));
  const [emi, setEmi] = useState("");
  const [months, setMonths] = useState<number>(12);
  const rupees = (value: string) => Math.round(Number(value) * 100) || 0;
  const ready = rupees(amount) > 0 && rupees(emi) > 0;
  const options = MONTHS.includes(months) ? MONTHS : [...MONTHS, months].sort((a, b) => a - b);

  async function readLetter(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setReading(true);
    setNote(null);
    try {
      const letter = await ownerApi.readSanction(loanId, await shrinkPhoto(file));
      if (letter.sanctioned_paise) setAmount(String(Math.round(letter.sanctioned_paise / 100)));
      if (letter.emi_paise) setEmi(String(Math.round(letter.emi_paise / 100)));
      if (letter.tenure_months) setMonths(letter.tenure_months);
      const all = letter.sanctioned_paise && letter.emi_paise && letter.tenure_months;
      setNote(all ? words.letterRead : words.letterUnread);
    } catch {
      notify(text.failed);
    } finally {
      setReading(false);
    }
  }

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
        <Button wide variant="soft" disabled={reading} onClick={() => camera.current?.click()}>
          {reading ? (
            <LoaderCircle aria-hidden className="size-5 animate-spin" />
          ) : (
            <Camera aria-hidden className="size-5" />
          )}
          {reading ? words.readingLetter : words.photoLetter}
        </Button>
        <input
          ref={camera}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={readLetter}
        />
        {note && <p className="text-sm font-semibold">{note}</p>}
        <Field label={words.sanctionedAmount} value={amount} onChange={setAmount} />
        <Field label={words.emiAmount} value={emi} onChange={setEmi} />
        <div>
          <p className="text-sm font-semibold text-ink-muted">{words.months}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {options.map((option) => (
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

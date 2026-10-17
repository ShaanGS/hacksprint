"use client";

import { Check } from "lucide-react";
import { useOwnerLanguage } from "@/components/owner/owner-language";
import { Amount } from "@/components/ui/amount";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { billPayWordsFor } from "@/lib/i18n/bill-pay";
import { formatMoney } from "@/lib/money";
import type { BillPayDecision } from "@/lib/owner/bill-pay-api";

/** The demo's stand-in for the owner's UPI app: the same details, and no money moves. */
export function UpiStandIn({
  open,
  decision,
  busy,
  onClose,
  onPaid,
}: {
  open: boolean;
  decision: BillPayDecision;
  busy: boolean;
  onClose: () => void;
  onPaid: () => void;
}) {
  const { lang } = useOwnerLanguage();
  const words = billPayWordsFor(lang);
  const rows: [string, string | null][] = [
    [words.fields.payee, decision.distributor],
    [words.fields.upiId, decision.upi_id],
    [words.fields.amount, formatMoney(decision.amount_paise)],
    [words.fields.bill, decision.bill_number],
  ];
  return (
    <Sheet
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title={words.standInTitle}
      footer={
        <div className="pb-3">
          <Button wide disabled={busy} onClick={onPaid}>
            <Check aria-hidden className="size-5" strokeWidth={3} />
            {words.iPaid}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Amount paise={decision.amount_paise} size="hero" className="block text-center" />
        <dl className="space-y-2 rounded-2xl bg-surface-muted p-4 text-base">
          {rows
            .filter((row): row is [string, string] => row[1] !== null)
            .map(([label, value]) => (
              <div key={label} className="flex items-baseline justify-between gap-3">
                <dt className="text-ink-muted">{label}</dt>
                <dd className="min-w-0 truncate font-semibold">{value}</dd>
              </div>
            ))}
        </dl>
        <p className="text-base text-ink-muted">{words.standInLine}</p>
      </div>
    </Sheet>
  );
}

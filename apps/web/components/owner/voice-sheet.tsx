"use client";

import { useState } from "react";
import { useOwnerLanguage } from "@/components/owner/owner-language";
import { useOwnerScreen } from "@/components/owner/owner-screen";
import { Amount } from "@/components/ui/amount";
import { Art, toArtName } from "@/components/ui/art";
import { Button } from "@/components/ui/button";
import { ListRow } from "@/components/ui/list-row";
import { Monogram } from "@/components/ui/monogram";
import { Sheet } from "@/components/ui/sheet";
import { formatMoney } from "@/lib/money";
import { ownerApi, type VoiceCard } from "@/lib/owner/api";

/**
 * B1: what the owner said, as one entry on a card. Nothing is saved until he taps (rule 3); a
 * name that did not match, or a wrong match, is fixed by tapping the right one. Closing the card
 * throws the entry away. Keyed on the entry by its parent, so each card starts fresh.
 */
export function VoiceSheet({ card, onDone }: { card: VoiceCard | null; onDone: () => void }) {
  const { text } = useOwnerLanguage();
  const { notify } = useOwnerScreen();
  const [picked, setPicked] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fields = card?.card ?? null;
  const chosenId = picked ?? fields?.customer?.id ?? fields?.product?.id ?? null;
  const chosen = card?.choices.find((choice) => choice.id === chosenId) ?? null;

  async function save(entryId: string) {
    setSaving(true);
    try {
      const credit = card?.kind === "credit_given" || card?.kind === "credit_repaid_cash";
      await ownerApi.confirm(entryId, {
        ...(credit && chosenId ? { customer_id: chosenId } : {}),
        ...(card?.kind === "stock_count" && chosenId ? { product_id: chosenId } : {}),
      });
      notify(text.saved);
      onDone();
    } catch {
      notify(text.failed);
    } finally {
      setSaving(false);
    }
  }

  function dismiss() {
    if (card?.entry_id) ownerApi.reject(card.entry_id).catch(() => undefined);
    onDone();
  }

  const amountMissing =
    card?.needs.includes("amount") || card?.needs.includes("qty") || card?.kind === null;
  const label = (() => {
    if (!card?.kind || !fields) return null;
    const amount = formatMoney(fields.amount_paise ?? 0);
    switch (card.kind) {
      case "credit_given":
        return chosen ? text.saveCredit(amount, chosen.name) : null;
      case "credit_repaid_cash":
        return chosen ? text.saveRepaid(amount, chosen.name) : null;
      case "day_close":
        return text.saveDayClose;
      case "stock_count":
        return chosen ? text.saveCount(String(fields.qty ?? "")) : null;
    }
  })();

  return (
    <Sheet
      open={card !== null}
      onOpenChange={(open) => !open && dismiss()}
      title={card?.kind ? text.entryTitles[card.kind] : text.notUnderstood}
      description={card?.transcript ? text.heard(card.transcript) : undefined}
      footer={
        card && (
          <div className="space-y-2 pb-3">
            {card.entry_id && label && !amountMissing && (
              <Button wide disabled={saving} onClick={() => card.entry_id && save(card.entry_id)}>
                {label}
              </Button>
            )}
            <Button wide variant="ghost" onClick={dismiss}>
              {text.notThis}
            </Button>
          </div>
        )
      }
    >
      {card && (
        <div className="space-y-4">
          {amountMissing && <p className="py-2 text-center text-base">{text.sayAgain}</p>}
          {(card.kind === "credit_given" || card.kind === "credit_repaid_cash") &&
            fields?.amount_paise && (
              <Amount paise={fields.amount_paise} size="hero" className="block text-center" />
            )}
          {card.kind === "day_close" && fields && (
            <dl className="space-y-3 rounded-2xl bg-surface-muted p-4">
              <Said label={text.cashSales} paise={fields.cash_sales_paise ?? null} />
              <Said label={text.moneyInHand} paise={fields.money_in_hand_paise ?? null} />
            </dl>
          )}
          {card.kind === "stock_count" && fields?.qty !== null && fields?.qty !== undefined && (
            <p className="text-center">
              <span className="block text-sm font-semibold text-ink-muted">{text.counted}</span>
              <span className="text-hero font-extrabold tracking-tight tabular-nums">
                {fields.qty}
              </span>
            </p>
          )}
          {card.choices.length > 0 && (
            <section>
              <h3 className="text-base font-bold">
                {card.kind === "stock_count" ? text.whichItem : text.whose}
              </h3>
              <div className="-mx-3 mt-1">
                {chosenFirst(card.choices, chosenId).map((choice) => (
                  <ListRow
                    key={choice.id}
                    art={
                      choice.art ? (
                        <Art name={toArtName(choice.art)} size={44} />
                      ) : (
                        <Monogram name={choice.name} />
                      )
                    }
                    title={choice.name}
                    selected={choice.id === chosenId}
                    onClick={() => setPicked(choice.id)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </Sheet>
  );
}

function Said({ label, paise }: { label: string; paise: number | null }) {
  const { text } = useOwnerLanguage();
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-base text-ink-muted">{label}</dt>
      <dd>
        {paise === null ? (
          <span className="text-base text-ink-muted">{text.notSaid}</span>
        ) : (
          <Amount paise={paise} size="xl" />
        )}
      </dd>
    </div>
  );
}

/** The matched name first, so the owner sees the guess without scrolling. */
function chosenFirst<T extends { id: string }>(choices: T[], chosenId: string | null): T[] {
  return [
    ...choices.filter((choice) => choice.id === chosenId),
    ...choices.filter((choice) => choice.id !== chosenId),
  ];
}

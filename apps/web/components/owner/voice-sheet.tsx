"use client";

import { useState } from "react";
import { useOwnerLanguage } from "@/components/owner/owner-language";
import { useOwnerScreen, type AgentKind } from "@/components/owner/owner-screen";
import type { OwnerTab } from "@/components/owner/tab-bar";
import { Amount } from "@/components/ui/amount";
import { ArtCircle, toArtName } from "@/components/ui/art";
import { Button } from "@/components/ui/button";
import { ListRow } from "@/components/ui/list-row";
import { Monogram } from "@/components/ui/monogram";
import { Sheet } from "@/components/ui/sheet";
import { agentWordsFor } from "@/lib/i18n/agents";
import { formatMoney } from "@/lib/money";
import { ownerApi, type QuestionTopic, type VoiceCard } from "@/lib/owner/api";

/**
 * B1: what the owner said, as one entry on a card. Nothing is saved until he taps (rule 3); a
 * name that did not match, or a wrong match, is fixed by tapping the right one. Closing the card
 * throws the entry away. Keyed on the entry by its parent, so each card starts fresh.
 */
// The tab that shows more about each answer.
const tabFor: Record<QuestionTopic, OwnerTab> = {
  week: "home",
  collect: "collect",
  customer: "collect",
  stock: "stock",
  dues: "bank",
  loan: "bank",
  items: "stock",
  collect_agent: "collect",
  reorder: "stock",
  plan: "home",
};

// The spoken jobs an agent does, and which agent.
const agentFor: Partial<Record<QuestionTopic, AgentKind>> = {
  collect_agent: "collect",
  reorder: "reorder",
  plan: "plan",
};

export function VoiceSheet({
  card,
  onDone,
  onOpen,
  onAgent,
}: {
  card: VoiceCard | null;
  onDone: () => void;
  onOpen: (tab: OwnerTab) => void;
  onAgent: (agent: AgentKind) => void;
}) {
  const { lang, text } = useOwnerLanguage();
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

  const amountMissing = card?.needs.includes("amount") || card?.needs.includes("qty");
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
      title={
        card?.kind === "question"
          ? text.answerTitle
          : card?.kind
            ? text.entryTitles[card.kind]
            : text.notUnderstoodEntry
      }
      tone="night"
      footer={
        card?.answer ? (
          <div className="space-y-2 pb-3">
            {agentFor[card.answer.topic] ? (
              <Button
                wide
                variant="yellow"
                onClick={() => {
                  const agent = card.answer && agentFor[card.answer.topic];
                  if (agent) onAgent(agent);
                  onDone();
                }}
              >
                {agentWordsFor(lang).letAgent}
              </Button>
            ) : (
              <Button
                wide
                variant="yellow"
                onClick={() => {
                  if (card.answer) onOpen(tabFor[card.answer.topic]);
                  onDone();
                }}
              >
                {text.openTab(text.tabs[tabFor[card.answer.topic]])}
              </Button>
            )}
            <Button wide variant="night" onClick={onDone}>
              {text.done}
            </Button>
          </div>
        ) : (
          card && (
            <div className="space-y-2 pb-3">
              {card.entry_id && label && !amountMissing && (
                <Button
                  wide
                  variant="yellow"
                  disabled={saving}
                  onClick={() => card.entry_id && save(card.entry_id)}
                >
                  {label}
                </Button>
              )}
              <Button wide variant="night" onClick={dismiss}>
                {text.notThis}
              </Button>
            </div>
          )
        )
      }
    >
      {card && (
        <div className="space-y-4">
          {card.transcript && (
            <div>
              <p className="text-sm text-night-muted">{text.youSaid}</p>
              <p className="mt-1 text-2xl leading-snug font-semibold">“{card.transcript}”</p>
            </div>
          )}
          {card.answer && (
            <p className="rounded-3xl bg-night-raised p-4 text-lg leading-snug">
              {card.answer.text}
            </p>
          )}
          {card.kind === null && <p className="py-2 text-center text-base">{text.sayEntryAgain}</p>}
          {amountMissing && <p className="py-2 text-center text-base">{text.sayAgain}</p>}
          {(card.kind === "credit_given" || card.kind === "credit_repaid_cash") &&
            fields?.amount_paise && (
              <Amount paise={fields.amount_paise} size="hero" className="block text-center" />
            )}
          {card.kind === "day_close" && fields && (
            <dl className="space-y-3 rounded-3xl bg-night-raised p-4">
              <Said label={text.cashSales} paise={fields.cash_sales_paise ?? null} />
              <Said label={text.moneyInHand} paise={fields.money_in_hand_paise ?? null} />
            </dl>
          )}
          {card.kind === "stock_count" && fields?.qty !== null && fields?.qty !== undefined && (
            <p className="text-center">
              <span className="block text-sm font-semibold text-night-muted">{text.counted}</span>
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
                        <ArtCircle name={toArtName(choice.art)} />
                      ) : (
                        <Monogram name={choice.name} />
                      )
                    }
                    title={choice.name}
                    tone="night"
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
      <dt className="text-base text-night-muted">{label}</dt>
      <dd>
        {paise === null ? (
          <span className="text-base text-night-muted">{text.notSaid}</span>
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

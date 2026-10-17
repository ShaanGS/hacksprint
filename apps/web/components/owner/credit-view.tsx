"use client";

import { useEffect, useState } from "react";
import { useOwnerLanguage } from "@/components/owner/owner-language";
import { useHoldToTalk } from "@/components/owner/use-hold-to-talk";
import { Amount } from "@/components/ui/amount";
import { Art } from "@/components/ui/art";
import { Button } from "@/components/ui/button";
import { HoldMic } from "@/components/ui/hold-mic";
import { ListRow } from "@/components/ui/list-row";
import { Monogram } from "@/components/ui/monogram";
import { Sheet } from "@/components/ui/sheet";
import { Ticker } from "@/components/ui/ticker";
import type { Recorder } from "@/lib/audio/recorder";
import type { CreditBook, CreditCustomer, CreditDraft, CreditEntry } from "@/lib/credit/types";
import { langInfo } from "@/lib/i18n/languages";
import { formatMoney } from "@/lib/money";
import type { OwnerBackend } from "@/lib/owner/backend";

/**
 * O4, spec D1: who owes the shop, most first. Counter credit is said, not typed: hold the mic and
 * say "Ramesh 200 on account"; code reads the amount and the name, and the owner taps to add it.
 * Tapping a customer shows the entries behind what they owe (E3).
 */
export function CreditView({
  backend,
  askMicrophone,
  notify,
}: {
  backend: OwnerBackend;
  askMicrophone: () => Promise<Recorder | null>;
  notify: (message: string) => void;
}) {
  const { lang, text } = useOwnerLanguage();
  const [book, setBook] = useState<CreditBook | null>(null);
  const [draft, setDraft] = useState<CreditDraft | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [viewing, setViewing] = useState<CreditCustomer | null>(null);
  const [entries, setEntries] = useState<CreditEntry[] | null>(null);
  const hold = useHoldToTalk({
    askMicrophone,
    onTooShort: () => notify(text.sayCredit),
    onMicBlocked: () => notify(text.micBlocked),
  });
  const day = (iso: string) =>
    new Date(iso).toLocaleDateString(langInfo[lang].sarvamCode, { day: "numeric", month: "short" });

  useEffect(() => {
    let current = true;
    backend.credit().then(
      (next) => {
        if (current) setBook(next);
      },
      () => undefined,
    );
    return () => {
      current = false;
    };
  }, [backend]);

  function heard(audio: Blob) {
    return backend.hearCredit(audio).then(
      (next) => {
        setDraft(next);
        setCustomerId(next.customerId);
      },
      () => notify(text.failed),
    );
  }

  async function add(entry: CreditDraft, amountPaise: number, id: string) {
    setAdding(true);
    try {
      await backend.addCredit(id, amountPaise, entry.heard);
      const name = entry.customers.find((c) => c.id === id)?.name ?? "";
      notify(text.creditAdded(formatMoney(amountPaise), name));
      setDraft(null);
      setBook(await backend.credit());
    } catch {
      notify(text.failed);
    } finally {
      setAdding(false);
    }
  }

  function open(customer: CreditCustomer) {
    setViewing(customer);
    setEntries(null);
    backend.creditEntries(customer.id).then(setEntries, () => setViewing(null));
  }

  if (!book) {
    return (
      <div className="grid h-full place-items-center">
        <Art name="khata" size={120} eager />
      </div>
    );
  }
  const chosen = draft?.customers.find((c) => c.id === customerId);
  return (
    <main className="px-4 pt-6 pb-32">
      <h1 className="text-title font-extrabold tracking-tight">{text.tabs.credit}</h1>
      <section className="relative mt-4 overflow-hidden rounded-3xl bg-tint-lilac p-5">
        <Art name="khata" size={120} eager className="absolute -top-1 -right-3" />
        <p className="text-sm font-semibold text-ink-muted">{text.owedToYou}</p>
        <Ticker
          paise={book.totalPaise}
          className="mt-1 block text-hero font-extrabold tracking-tight"
        />
        <p className="mt-1 text-base text-ink-muted">
          {text.customersOnAccount(book.customers.length)}
        </p>
      </section>

      <div className="mt-4 flex items-center gap-3 rounded-2xl bg-surface-muted p-3">
        <HoldMic
          size="md"
          state={hold.mic}
          label={hold.mic === "listening" ? text.listening : text.sayCredit}
          onHoldStart={hold.holdStarted}
          onHoldEnd={() => hold.holdEnded(heard)}
        />
        <p aria-live="polite" className="text-base font-medium">
          {hold.mic === "listening"
            ? text.listening
            : hold.mic === "thinking"
              ? text.working
              : text.sayCredit}
        </p>
      </div>

      {book.customers.length === 0 ? (
        <div className="mt-8 flex flex-col items-center text-center">
          <Art name="savings" size={120} />
          <p className="mt-3 text-lg text-ink-muted">{text.nobodyOwes}</p>
        </div>
      ) : (
        <ul className="-mx-3 mt-4">
          {book.customers.map((customer) => (
            <li key={customer.id}>
              <ListRow
                art={<Monogram name={customer.name} />}
                title={customer.name}
                meta={text.lastOn(day(customer.lastAt))}
                trailing={<Amount paise={customer.owedPaise} size="lg" />}
                onClick={() => open(customer)}
              />
            </li>
          ))}
        </ul>
      )}

      <Sheet
        open={draft !== null}
        onOpenChange={(next) => !next && setDraft(null)}
        title={text.creditDraftTitle}
        description={draft ? text.heard(draft.heard) : undefined}
        footer={
          draft?.amountPaise && chosen ? (
            <Button
              wide
              disabled={adding}
              onClick={() => draft.amountPaise && add(draft, draft.amountPaise, chosen.id)}
            >
              {text.addCredit(formatMoney(draft.amountPaise), chosen.name)}
            </Button>
          ) : undefined
        }
      >
        {draft &&
          (draft.amountPaise === null ? (
            <p className="py-6 text-center text-base">{text.sayAmountAgain}</p>
          ) : (
            <div>
              <Amount paise={draft.amountPaise} size="hero" className="block text-center" />
              <h3 className="mt-4 text-base font-bold">{text.whoseAccount}</h3>
              <div className="-mx-3 mt-1">
                {matchedFirst(draft).map((customer) => (
                  <ListRow
                    key={customer.id}
                    art={<Monogram name={customer.name} />}
                    title={customer.name}
                    selected={customer.id === customerId}
                    onClick={() => setCustomerId(customer.id)}
                  />
                ))}
              </div>
            </div>
          ))}
      </Sheet>

      <Sheet
        open={viewing !== null}
        onOpenChange={(next) => !next && setViewing(null)}
        title={viewing?.name ?? ""}
        footer={
          viewing && (
            <p className="flex items-baseline justify-between text-lg font-bold">
              {text.addsUpTo}
              <Amount paise={viewing.owedPaise} size="xl" />
            </p>
          )
        }
      >
        {!entries ? (
          <div className="grid h-32 place-items-center">
            <Art name="clock" size={72} />
          </div>
        ) : (
          <ul className="-mx-3">
            {entries.map((entry, index) => (
              <li key={`${entry.at}-${index}`}>
                <ListRow
                  title={text.entryKinds[entry.kind]}
                  meta={[day(entry.at), entry.orderNumber ? `#${entry.orderNumber}` : entry.note]
                    .filter(Boolean)
                    .join(" · ")}
                  trailing={<Amount paise={entry.amountPaise} size="md" />}
                />
              </li>
            ))}
          </ul>
        )}
      </Sheet>
    </main>
  );
}

/** The customer the words matched comes first, so the owner sees the guess without scrolling. */
function matchedFirst(draft: CreditDraft) {
  const matched = draft.customers.filter((customer) => customer.id === draft.customerId);
  return [...matched, ...draft.customers.filter((customer) => customer.id !== draft.customerId)];
}

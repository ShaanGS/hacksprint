"use client";

import { MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useOwnerLanguage } from "@/components/owner/owner-language";
import { useOwnerScreen } from "@/components/owner/owner-screen";
import { SourceBadge } from "@/components/owner/source-badge";
import { useDates } from "@/components/owner/use-dates";
import { Amount } from "@/components/ui/amount";
import { Art } from "@/components/ui/art";
import { Button, LinkButton } from "@/components/ui/button";
import { ListRow } from "@/components/ui/list-row";
import { Sheet } from "@/components/ui/sheet";
import { langInfo } from "@/lib/i18n/languages";
import { formatMoney } from "@/lib/money";
import { ownerApi, type CustomerDetail, type CustomerRow, type Reminder } from "@/lib/owner/api";

/**
 * One customer (A4, E3): what they owe, every entry behind it with its source, and the reminder.
 * The reminder is a fixed message in the customer's language with a payment link; WhatsApp opens
 * with it and the owner presses send himself (rule 3).
 */
export function CustomerSheet({
  customer,
  onClose,
}: {
  customer: CustomerRow | null;
  onClose: () => void;
}) {
  const { text } = useOwnerLanguage();
  const { demo, notify } = useOwnerScreen();
  const dates = useDates();
  const id = customer?.customer_id ?? null;
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [reminder, setReminder] = useState<Reminder | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    let current = true;
    ownerApi.customer(id).then(
      (next) => {
        if (current) setDetail(next);
      },
      () => undefined,
    );
    return () => {
      current = false;
      setDetail(null);
      setReminder(null);
    };
  }, [id, customer?.balance_paise]);

  async function remind(customerId: string) {
    setBusy(true);
    try {
      setReminder(await ownerApi.remind(customerId));
    } catch {
      notify(text.failed);
    } finally {
      setBusy(false);
    }
  }

  async function markPaid(paymentId: string) {
    setBusy(true);
    try {
      await ownerApi.markPaid(paymentId);
    } catch {
      notify(text.failed);
    } finally {
      setBusy(false);
    }
  }

  const language = langInfo[customer?.lang ?? "ta"].name;
  return (
    <Sheet
      open={customer !== null}
      onOpenChange={(open) => !open && onClose()}
      title={customer?.name ?? ""}
      description={customer ? text.reason(customer.reason) : undefined}
      footer={
        customer && (
          <div className="space-y-2 pb-3">
            {reminder ? (
              <LinkButton
                wide
                href={reminder.whatsapp_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle aria-hidden className="size-5" />
                {text.openWhatsApp}
              </LinkButton>
            ) : (
              <Button wide disabled={busy} onClick={() => remind(customer.customer_id)}>
                <MessageCircle aria-hidden className="size-5" />
                {text.remind}
              </Button>
            )}
            {demo && reminder && (
              <Button
                wide
                variant="soft"
                disabled={busy}
                onClick={() => markPaid(reminder.payment_id)}
              >
                {text.markPaid}
              </Button>
            )}
          </div>
        )
      }
    >
      {customer && (
        <div className="space-y-5">
          <div className="text-center">
            <Amount paise={customer.balance_paise} size="hero" className="block" />
            <div className="mt-2 flex justify-center">
              <SourceBadge label={customer.label} />
            </div>
          </div>

          {reminder && (
            <section>
              <p className="text-sm font-semibold text-ink-muted">{text.messageIn(language)}</p>
              <p className="mt-2 rounded-2xl rounded-tl-sm bg-tint-mint p-4 text-base whitespace-pre-wrap">
                {reminder.message_text}
              </p>
              <p className="mt-2 text-sm text-ink-muted">{text.youSend}</p>
            </section>
          )}

          <section>
            <h3 className="text-base font-bold">{text.everyEntry}</h3>
            {!detail ? (
              <div className="grid h-24 place-items-center">
                <Art name="clock" size={56} />
              </div>
            ) : (
              <ul className="-mx-3 mt-1">
                {detail.entries.map((entry) => (
                  <li key={entry.id}>
                    <ListRow
                      title={text.creditKinds[entry.kind]}
                      meta={dates.dayAndTime(entry.at)}
                      note={<SourceBadge label={entry.label} />}
                      trailing={
                        <span className="text-base font-medium tabular-nums">
                          {entry.kind === "repayment" ? "−" : "+"}
                          {formatMoney(Math.abs(entry.amount_paise))}
                        </span>
                      }
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </Sheet>
  );
}

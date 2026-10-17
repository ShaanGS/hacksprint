"use client";

import { Check, ExternalLink, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { useOwnerLanguage } from "@/components/owner/owner-language";
import { useOwnerScreen } from "@/components/owner/owner-screen";
import { Amount } from "@/components/ui/amount";
import { Art, toArtName } from "@/components/ui/art";
import { Button, LinkButton } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { Steps, type Step } from "@/components/ui/steps";
import { agentWordsFor } from "@/lib/i18n/agents";
import { formatMoney } from "@/lib/money";
import { RequestError } from "@/lib/owner/fetch";
import {
  ownerApi,
  type ReorderGroup,
  type ReorderPlan,
  type SentReorder,
  type StockOrderPayment,
} from "@/lib/owner/api";

// How often a waiting test payment is checked.
const CHECK_MS = 5_000;

/**
 * The reorder agent (decision of Oct 17): what runs out this week, at the quantity and price of
 * its last bill, slow stock left out. Nothing goes until the owner taps Send; then n8n emails the
 * distributor. Paying is test mode only and never changes the shop's numbers.
 */
export function ReorderAgent({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { lang, text } = useOwnerLanguage();
  return (
    <Sheet
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title={agentWordsFor(lang).reorderTitle}
      tone="night"
      footer={
        <div className="pb-3">
          <Button wide variant="night" onClick={onClose}>
            {text.done}
          </Button>
        </div>
      }
    >
      {open && <Reordering />}
    </Sheet>
  );
}

function Reordering() {
  const { lang, text } = useOwnerLanguage();
  const { notify } = useOwnerScreen();
  const words = agentWordsFor(lang);
  const [plan, setPlan] = useState<ReorderPlan | null>(null);
  const [sent, setSent] = useState<Record<string, SentReorder>>({});

  useEffect(() => {
    let current = true;
    ownerApi.reorderPlan().then(
      (next) => current && setPlan(next),
      () => current && notify(text.failed),
    );
    return () => {
      current = false;
    };
  }, [notify, text.failed]);

  const lines = plan?.groups.reduce((count, group) => count + group.lines.length, 0) ?? 0;
  const anySent = Object.keys(sent).length > 0;
  const allSent = plan !== null && plan.groups.every((g) => sent[g.distributor_id]);
  const steps: Step[] = [
    {
      title: words.reorderSteps.shelf,
      meta: plan ? words.runsOut(lines) : null,
      state: plan ? "done" : "current",
    },
    {
      title: words.reorderSteps.skipped,
      meta: plan
        ? words.leftOut(
            plan.skipped.slow,
            formatMoney(plan.skipped.stuck_paise),
            plan.skipped.lasting,
          )
        : null,
      state: plan ? "done" : "todo",
    },
    ...(lines > 0
      ? ([
          { title: words.reorderSteps.bills, meta: words.fromBills, state: "done" },
          {
            title: words.reorderSteps.approve,
            meta: words.approveHint,
            state: allSent ? "done" : "current",
          },
          {
            title: words.reorderSteps.sent,
            meta: anySent
              ? Object.values(sent)
                  .map((order) => words.sentTo(order.distributor))
                  .join(". ")
              : null,
            state: anySent ? "done" : "todo",
          },
        ] satisfies Step[])
      : []),
  ];

  return (
    <div className="space-y-5">
      <Steps tone="night" steps={steps} />
      {plan && lines === 0 && <p className="text-base text-night-muted">{words.nothingToOrder}</p>}
      {plan?.groups.map((group) => (
        <OrderCard
          key={group.distributor_id}
          group={group}
          sent={sent[group.distributor_id] ?? null}
          onSent={(order) => setSent((before) => ({ ...before, [group.distributor_id]: order }))}
        />
      ))}
    </div>
  );
}

function OrderCard({
  group,
  sent,
  onSent,
}: {
  group: ReorderGroup;
  sent: SentReorder | null;
  onSent: (order: SentReorder) => void;
}) {
  const { lang, text } = useOwnerLanguage();
  const { notify } = useOwnerScreen();
  const words = agentWordsFor(lang);
  const [busy, setBusy] = useState(false);
  const [payment, setPayment] = useState<StockOrderPayment | null>(null);

  async function send() {
    setBusy(true);
    try {
      onSent(
        await ownerApi.sendReorder(
          group.distributor_id,
          group.lines.map((line) => line.product_id),
        ),
      );
    } catch (error) {
      notify(
        error instanceof RequestError && error.status === 502 ? words.couldNotSend : text.failed,
      );
    } finally {
      setBusy(false);
    }
  }

  async function pay(orderId: string) {
    setBusy(true);
    try {
      setPayment(await ownerApi.payReorder(orderId));
    } catch {
      notify(text.failed);
    } finally {
      setBusy(false);
    }
  }

  const waitingPayment = payment && !payment.paid ? payment.payment_id : null;
  useEffect(() => {
    if (!waitingPayment) return;
    const timer = setInterval(() => {
      ownerApi.checkPayment(waitingPayment).then(
        (result) => result.paid && setPayment((before) => before && { ...before, paid: true }),
        () => undefined,
      );
    }, CHECK_MS);
    return () => clearInterval(timer);
  }, [waitingPayment]);

  return (
    <section className="rounded-3xl bg-night-raised p-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-lg font-bold">{group.distributor}</p>
        <Amount paise={group.total_paise} size="md" />
      </div>
      <ul className="mt-3 space-y-2">
        {group.lines.map((line) => (
          <li key={line.product_id} className="flex items-center gap-3">
            <Art name={toArtName(line.art)} size={40} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-base font-semibold">{line.name}</span>
              <span className="block text-sm text-night-muted">
                {line.qty} {line.unit} · {formatMoney(line.unit_cost_paise)}
              </span>
            </span>
            <span className="text-base font-semibold tabular-nums">
              {formatMoney(line.line_paise)}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-4 space-y-2">
        {!sent ? (
          <Button wide variant="yellow" disabled={busy} onClick={send}>
            <Send aria-hidden className="size-5" />
            {words.sendTo(group.distributor)}
          </Button>
        ) : (
          <>
            <p className="flex items-start gap-2 text-base font-semibold text-yellow">
              <Check aria-hidden className="mt-0.5 size-5 shrink-0" strokeWidth={3} />
              {words.sentTo(group.distributor)}
            </p>
            {!payment ? (
              <Button
                wide
                variant="night"
                disabled={busy}
                onClick={() => pay(sent.purchase_order_id)}
              >
                {words.payTest(formatMoney(sent.total_paise))}
              </Button>
            ) : payment.paid ? (
              <p className="flex items-start gap-2 text-base font-semibold text-yellow">
                <Check aria-hidden className="mt-0.5 size-5 shrink-0" strokeWidth={3} />
                {words.paidTest(formatMoney(payment.amount_paise))}
              </p>
            ) : (
              <LinkButton
                wide
                variant="night"
                href={payment.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink aria-hidden className="size-5" />
                {words.openPayment}
              </LinkButton>
            )}
            {payment && <p className="text-sm text-night-muted">{words.testNote}</p>}
          </>
        )}
      </div>
    </section>
  );
}

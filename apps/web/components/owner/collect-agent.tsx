"use client";

import { MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useLive } from "@/components/owner/live";
import { useOwnerLanguage } from "@/components/owner/owner-language";
import { useOwnerScreen } from "@/components/owner/owner-screen";
import { Badge } from "@/components/ui/badge";
import { Button, LinkButton } from "@/components/ui/button";
import { Monogram } from "@/components/ui/monogram";
import { Sheet } from "@/components/ui/sheet";
import { Steps, type Step } from "@/components/ui/steps";
import { agentWordsFor } from "@/lib/i18n/agents";
import { langInfo } from "@/lib/i18n/languages";
import { formatMoney } from "@/lib/money";
import { ownerApi, type CustomerRow, type Reminder } from "@/lib/owner/api";

// How often a waiting payment link is checked while the agent watches.
const CHECK_MS = 5_000;

type Job = { customer: CustomerRow; reminder: Reminder };

const loadNow = () =>
  Promise.all([ownerApi.collect(), ownerApi.rotation()]).then(([collect, rotation]) => ({
    collect,
    rotation,
  }));

/**
 * The collection agent (A3 to A5, done for him): finds the late payers in collect order, writes
 * each reminder with a payment link in the customer's language, and watches the money come in.
 * He sends each message from his own WhatsApp (rule 3); a payment counts once its link is paid.
 */
export function CollectAgent({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { lang, text } = useOwnerLanguage();
  return (
    <Sheet
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title={agentWordsFor(lang).collectTitle}
      footer={
        <div className="pb-3">
          <Button wide variant="soft" onClick={onClose}>
            {text.done}
          </Button>
        </div>
      }
    >
      {open && <Collecting />}
    </Sheet>
  );
}

function Collecting() {
  const { lang, text } = useOwnerLanguage();
  const { demo, notify } = useOwnerScreen();
  const words = agentWordsFor(lang);
  const [late, setLate] = useState<CustomerRow[] | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [sent, setSent] = useState<ReadonlySet<string>>(new Set());
  const live = useLive(loadNow, ["credit", "rotation"]);

  useEffect(() => {
    let current = true;
    (async () => {
      const start = await ownerApi.collect();
      const latePayers = start.customers.filter((c) => c.reason.kind === "late");
      if (!current) return;
      setLate(latePayers);
      for (const customer of latePayers) {
        // One reminder failing (say, paid in cash a moment ago) does not stop the others.
        const reminder = await ownerApi.remind(customer.customer_id).catch(() => null);
        if (!current) return;
        if (reminder) setJobs((done) => [...done, { customer, reminder }]);
      }
    })().catch(() => {
      if (current) notify(text.failed);
    });
    return () => {
      current = false;
    };
  }, [notify, text.failed]);

  // What each customer owes now; someone no longer listed owes nothing.
  const owed = live.data
    ? new Map(live.data.collect.customers.map((c) => [c.customer_id, c.balance_paise]))
    : null;
  const paidOf = (job: Job) =>
    owed ? Math.max(0, job.reminder.amount_paise - (owed.get(job.customer.customer_id) ?? 0)) : 0;
  const waiting = jobs.filter((job) => paidOf(job) === 0).map((job) => job.reminder.payment_id);
  const waitingKey = waiting.join(" ");
  const { reload } = live;

  useEffect(() => {
    if (!waitingKey) return;
    const timer = setInterval(() => {
      for (const paymentId of waitingKey.split(" ")) {
        ownerApi.checkPayment(paymentId).then(
          (result) => result.paid && reload(),
          () => undefined,
        );
      }
    }, CHECK_MS);
    return () => clearInterval(timer);
  }, [waitingKey, reload]);

  const paytm = jobs.some((job) => job.reminder.payment_link_url.includes("paytm"));
  const received = jobs.reduce((sum, job) => sum + paidOf(job), 0);
  const allWritten = late !== null && jobs.length === late.length;
  const week = live.data?.rotation.week;
  const steps: Step[] = [
    {
      title: words.collectSteps.found,
      meta:
        late === null
          ? null
          : late.length > 0
            ? words.found(late.length, formatMoney(late.reduce((s, c) => s + c.balance_paise, 0)))
            : words.nobodyLate,
      state: late === null ? "current" : "done",
    },
    {
      title: words.collectSteps.wrote,
      meta: late && late.length > 0 ? words.wrote(jobs.length, late.length, paytm) : null,
      state: allWritten ? "done" : late ? "current" : "todo",
    },
    {
      title: words.collectSteps.send,
      meta: allWritten ? words.sendHint : null,
      state: !allWritten ? "todo" : sent.size >= jobs.length ? "done" : "current",
    },
    {
      title: words.collectSteps.watch,
      meta:
        sent.size === 0 && received === 0
          ? null
          : [
              received > 0 ? words.received(formatMoney(received)) : words.waiting,
              week && `${text.weekState[week.state]}: ${formatMoney(Math.abs(week.gap_paise))}`,
              words.verifiedBy(paytm),
            ]
              .filter(Boolean)
              .join(". "),
      state: waiting.length === 0 && jobs.length > 0 ? "done" : sent.size > 0 ? "current" : "todo",
    },
  ];

  return (
    <div className="space-y-5">
      <Steps steps={late && late.length === 0 ? steps.slice(0, 1) : steps} />
      {jobs.length > 0 && (
        <ul className="divide-y divide-border">
          {jobs.map((job) => {
            const id = job.customer.customer_id;
            const paid = paidOf(job);
            return (
              <li key={id} className="flex items-center gap-3 py-3">
                <Monogram name={job.customer.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-bold">{job.customer.name}</p>
                  <p className="text-sm text-ink-muted">
                    {formatMoney(job.reminder.amount_paise)} ·{" "}
                    {langInfo[job.customer.lang ?? "ta"].name}
                  </p>
                  {demo && paid === 0 && (
                    <button
                      type="button"
                      className="mt-1 text-sm font-semibold text-ink-muted underline"
                      onClick={() =>
                        ownerApi
                          .markPaid(job.reminder.payment_id)
                          .then(reload, () => notify(text.failed))
                      }
                    >
                      {text.markPaid}
                    </button>
                  )}
                </div>
                {paid > 0 ? (
                  <Badge tone="success">{words.paid(formatMoney(paid))}</Badge>
                ) : (
                  <LinkButton
                    variant={sent.has(id) ? "soft" : "primary"}
                    href={job.reminder.whatsapp_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-11 shrink-0 px-4"
                    onClick={() => setSent((before) => new Set(before).add(id))}
                  >
                    <MessageCircle aria-hidden className="size-5" />
                    {sent.has(id) ? words.sent : words.send}
                  </LinkButton>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

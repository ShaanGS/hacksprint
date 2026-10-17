"use client";

import { Check, ExternalLink, FileText } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useOwnerLanguage } from "@/components/owner/owner-language";
import { useOwnerScreen } from "@/components/owner/owner-screen";
import { useDates } from "@/components/owner/use-dates";
import { Amount } from "@/components/ui/amount";
import { Button, LinkButton } from "@/components/ui/button";
import { FeatureCard } from "@/components/ui/feature-card";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/money";
import { ownerApi, type Link, type LoanPurpose, type LoanReady } from "@/lib/owner/api";
import { schemeWords } from "@/lib/schemes/catalog";

/**
 * D3 and D4: from his week and the festival order, does he need a loan, how much, which official
 * scheme covers it and what to ask for; then the pack he takes to the bank himself. When the
 * late payers can cover it, it says so instead.
 */
export function LoanCheck({ onCollect }: { onCollect: () => void }) {
  const { lang, text } = useOwnerLanguage();
  const { notify } = useOwnerScreen();
  const [purpose, setPurpose] = useState<LoanPurpose>("stock_rotation");
  const [answer, setAnswer] = useState<LoanReady | null>(null);
  const [packUrl, setPackUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run<T>(work: () => Promise<T>, done: (result: T) => void) {
    setBusy(true);
    try {
      done(await work());
    } catch {
      notify(text.failed);
    } finally {
      setBusy(false);
    }
  }

  const pageLang = lang === "ta" ? "ta" : "en";
  return (
    <>
      <FeatureCard banner="approve" title={text.loanTitle} text={text.loanText} className="mt-4">
        <div className="mt-4 flex flex-wrap gap-2">
          {(["stock_rotation", "equipment"] as const).map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={purpose === key}
              onClick={() => setPurpose(key)}
              className={cn(
                "flex min-h-11 items-center gap-1.5 rounded-full px-4 text-sm font-semibold",
                purpose === key
                  ? "bg-surface text-ink"
                  : "border border-accent-ink/40 text-accent-ink",
              )}
            >
              {purpose === key && <Check aria-hidden className="size-4" strokeWidth={3} />}
              {text.purposes[key]}
            </button>
          ))}
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            run(
              () => ownerApi.loanReady(purpose),
              (next) => {
                setPackUrl(null);
                setAnswer(next);
              },
            )
          }
          className="mt-4 flex min-h-14 w-full items-center justify-center rounded-xl bg-surface text-base font-semibold text-ink transition-transform active:scale-98 disabled:opacity-60"
        >
          {busy && !answer ? text.working : text.check}
        </button>
      </FeatureCard>

      <Sheet
        open={answer !== null}
        onOpenChange={(open) => !open && setAnswer(null)}
        title={text.loanTitle}
        footer={
          answer && (
            <div className="pb-3">
              {answer.no_loan_needed ? (
                <Button
                  wide
                  onClick={() => {
                    setAnswer(null);
                    onCollect();
                  }}
                >
                  {text.seeWho}
                </Button>
              ) : packUrl ? (
                <LinkButton
                  wide
                  href={`${packUrl}?lang=${pageLang}`}
                  target="_blank"
                  rel="noopener"
                >
                  <FileText aria-hidden className="size-5" />
                  {text.openPack}
                </LinkButton>
              ) : (
                <Button
                  wide
                  disabled={busy}
                  onClick={() =>
                    run(
                      () => ownerApi.loanPack(answer.loan_request_id),
                      (pack) => setPackUrl(pack.share_url),
                    )
                  }
                >
                  <FileText aria-hidden className="size-5" />
                  {text.makePack}
                </Button>
              )}
            </div>
          )
        }
      >
        {answer && <Answer answer={answer} />}
      </Sheet>
    </>
  );
}

function Answer({ answer }: { answer: LoanReady }) {
  const { lang, text } = useOwnerLanguage();
  const dates = useDates();
  const words = schemeWords(lang === "ta" ? "ta" : "en");
  const spare = answer.gap_without_order_paise;
  const links: Link[] = [
    ...(answer.scheme?.links ?? []),
    ...answer.loan_form.links,
    ...(answer.registration.step === "udyam"
      ? [{ label: text.udyamTitle, url: answer.registration.url }]
      : []),
  ];
  return (
    <div className="space-y-5">
      <div>
        <p className="text-2xl font-extrabold tracking-tight">
          {answer.no_loan_needed
            ? text.noLoan
            : text.needLoan(formatMoney(answer.loan_needed_paise))}
        </p>
        {answer.no_loan_needed && (
          <p className="mt-1 text-base">
            {text.noLoanLine(formatMoney(answer.can_collect_paise), answer.late_customers)}
          </p>
        )}
      </div>

      <dl className="space-y-2 rounded-2xl bg-surface-muted p-4 text-base">
        <MathLine
          label={answer.need.order ? text.mathOrder(answer.need.order.festival) : text.mathSaid}
          value={formatMoney(answer.need.paise)}
        />
        <MathLine
          label={spare >= 0 ? text.mathSpare : text.mathShort}
          value={`${spare >= 0 ? "−" : "+"} ${formatMoney(Math.abs(spare))}`}
        />
        <MathLine label={text.mathCollect} value={`− ${formatMoney(answer.can_collect_paise)}`} />
        <div className="border-t border-border pt-2">
          <MathLine
            label={text.mathLoan}
            value={<Amount paise={answer.loan_needed_paise} size="lg" />}
          />
        </div>
      </dl>

      {answer.scheme && (
        <Block title={words.mudraName}>
          {answer.scheme.band !== null ? (
            <>
              <p className="text-lg font-bold">
                {words.band(answer.scheme.band).name}: {words.band(answer.scheme.band).range}
              </p>
              <p>{words.noCollateral}</p>
              <p className="text-ink-muted">{words.interest}</p>
            </>
          ) : (
            <p>{words.notCovered(answer.scheme.not_covered)}</p>
          )}
        </Block>
      )}

      {!answer.no_loan_needed && (
        <>
          <Block title={text.askFor}>
            <p className="text-lg font-bold">{words.loanForm(answer.loan_form.purpose).line}</p>
            <p>{words.loanForm(answer.loan_form.purpose).why}</p>
          </Block>
          {answer.registration.step !== "none" && (
            <Block title={text.beforeApply}>
              <p className="font-bold">
                {answer.registration.step === "udyam" ? text.udyamTitle : text.udyamAssistTitle}
              </p>
              <p>{answer.registration.step === "udyam" ? words.udyam : words.udyamAssist}</p>
            </Block>
          )}
          <Block title={text.whereApply}>
            <p>{words.applyAt}</p>
          </Block>
        </>
      )}

      <section className="space-y-2 rounded-2xl bg-surface-muted p-4">
        {words.fixedLines.map((line) => (
          <p key={line} className="text-base font-semibold">
            {line}
          </p>
        ))}
      </section>

      {links.length > 0 && (
        <Block title={text.officialLinks}>
          <ul className="space-y-1">
            {links.map((link) => (
              <li key={link.url}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-11 items-center gap-2 font-medium underline underline-offset-4"
                >
                  <ExternalLink aria-hidden className="size-4 shrink-0" />
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </Block>
      )}
      <p className="text-sm text-ink-muted">{text.checkedOn(dates.day(answer.checked_on))}</p>
    </div>
  );
}

function MathLine({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="font-semibold whitespace-nowrap tabular-nums">{value}</dd>
    </div>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-1 text-base">
      <h3 className="text-sm font-semibold text-ink-muted">{title}</h3>
      {children}
    </section>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import type { ReactNode } from "react";
import { PaperHeader } from "@/components/paper/paper-header";
import { StatementView } from "@/components/paper/statement-view";
import { Badge } from "@/components/ui/badge";
import { moneyTextFor } from "@/lib/i18n/money";
import { paperLang, paperTextFor } from "@/lib/i18n/paper";
import { loadLoanPack } from "@/lib/loans/load";
import { formatMoney } from "@/lib/money";
import {
  CHECKED_ON,
  janSamarth,
  loanForms,
  mudra,
  schemeWords,
  udyam,
  udyamAssist,
} from "@/lib/schemes/catalog";
import { createServiceClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Loan pack", robots: { index: false } };

/**
 * D4: the pack the owner takes to his bank himself (rule 8): how much and why, from his own
 * numbers; the Mudra band; the stock quotation from supplier bills; the documents; the statement;
 * official links only and the fee warning. No customer names or phone numbers.
 */
export default async function LoanPackPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ lang?: string | string[] }>;
}) {
  await connection();
  const [{ token }, query] = await Promise.all([params, searchParams]);
  const pack = await loadLoanPack(createServiceClient(), token);
  if (!pack) notFound();
  const lang = paperLang(query.lang);
  const text = paperTextFor(lang);
  const money = moneyTextFor(lang);
  const words = schemeWords(lang);
  const locale = lang === "ta" ? "ta-IN" : "en-IN";
  const day = (iso: string) =>
    new Date(iso).toLocaleDateString(locale, {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    });
  const request = pack.loan_requests;
  const { quotation, registration, items } = pack.checklist;
  const statement = pack.statements.payload;
  const spare = request.gap_without_order_paise;
  const band =
    pack.scheme_band === "needs_tarun_repaid" || pack.scheme_band === "above_mudra"
      ? null
      : words.band(pack.scheme_band);
  const links = [
    ...mudra.links,
    ...janSamarth.links,
    ...loanForms[request.purpose].links,
    ...(registration.step === "udyam" ? udyam.links : []),
    ...(registration.step === "udyam_assist" ? udyamAssist.links : []),
  ];

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 print:max-w-none print:p-0">
      <PaperHeader
        kind={text.loanPack}
        shop={statement.shop}
        lines={[text.madeOn(day(pack.generated_at))]}
        demo={statement.demo_data}
        lang={lang}
      />

      <Part title={text.loanNeeded}>
        <p className="text-hero font-extrabold tracking-tight tabular-nums">
          {formatMoney(request.loan_needed_paise)}
        </p>
        <p className="text-base">
          {text.loanFor}: {money.purposes[request.purpose]}
        </p>
        <dl className="mt-3 space-y-1 rounded-2xl bg-surface-muted p-4 text-base">
          <Line
            label={quotation ? money.mathOrder(quotation.festival) : money.mathSaid}
            value={formatMoney(request.need_paise)}
          />
          <Line
            label={spare >= 0 ? money.mathSpare : money.mathShort}
            value={`${spare >= 0 ? "−" : "+"} ${formatMoney(Math.abs(spare))}`}
          />
          <Line label={money.mathCollect} value={`− ${formatMoney(request.can_collect_paise)}`} />
          <Line label={money.mathLoan} value={formatMoney(request.loan_needed_paise)} />
        </dl>
        <p className="mt-2 text-sm text-ink-muted">{text.workedOut}</p>
      </Part>

      <Part title={`${text.scheme}: ${words.mudraName}`}>
        {band ? (
          <>
            <p className="text-lg font-bold">
              {band.name}: {band.range}
            </p>
            <p>{words.noCollateral}</p>
            <p className="text-ink-muted">{words.interest}</p>
          </>
        ) : (
          <p>
            {words.notCovered(
              pack.scheme_band === "needs_tarun_repaid" ? "needs_tarun_repaid" : "above_mudra",
            )}
          </p>
        )}
        <h3 className="mt-4 text-sm font-semibold text-ink-muted">{money.askFor}</h3>
        <p className="text-lg font-bold">{words.loanForm(request.purpose).line}</p>
        <p>{words.loanForm(request.purpose).why}</p>
        {registration.step !== "none" && (
          <>
            <h3 className="mt-4 text-sm font-semibold text-ink-muted">{money.beforeApply}</h3>
            <p className="font-bold">
              {registration.step === "udyam" ? money.udyamTitle : money.udyamAssistTitle}
            </p>
            <p>{registration.step === "udyam" ? words.udyam : words.udyamAssist}</p>
          </>
        )}
      </Part>

      {quotation && (
        <Part
          title={text.quotation}
          note={text.quotationFrom(quotation.festival, quotation.distributor)}
        >
          <table className="w-full text-base">
            <thead>
              <tr className="border-b border-border text-left text-sm text-ink-muted">
                <th className="py-2 font-semibold">{text.columns.item}</th>
                <th className="py-2 text-right font-semibold">{text.columns.qty}</th>
                <th className="py-2 text-right font-semibold">{text.columns.rate}</th>
                <th className="py-2 text-right font-semibold">{text.columns.amount}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border tabular-nums">
              {quotation.lines.map((line) => (
                <tr key={line.name}>
                  <td className="py-2 pr-2">{line.name}</td>
                  <td className="py-2 text-right">{line.qty}</td>
                  <td className="py-2 text-right">{formatMoney(line.unit_cost_paise)}</td>
                  <td className="py-2 text-right">{formatMoney(line.line_paise)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-ink font-bold">
                <td className="py-2" colSpan={3}>
                  {text.total}
                </td>
                <td className="py-2 text-right tabular-nums">
                  {formatMoney(quotation.total_paise)}
                </td>
              </tr>
            </tfoot>
          </table>
          <p className="mt-2">
            <Badge>{money.labels.supplier_bill}</Badge>
          </p>
        </Part>
      )}

      <Part title={text.documents}>
        <ul className="divide-y divide-border">
          {items.map((item) => (
            <li key={item.key} className="flex items-center justify-between gap-3 py-2">
              <span className="text-base">{text.checklist[item.key]}</span>
              <Badge
                tone={
                  item.status === "have"
                    ? "success"
                    : item.status === "missing"
                      ? "danger"
                      : "neutral"
                }
              >
                {text.status[item.status]}
              </Badge>
            </li>
          ))}
        </ul>
      </Part>

      <Part title={text.statement}>
        <StatementView payload={statement} lang={lang} />
      </Part>

      <Part title={money.whereApply}>
        <p>{words.applyAt}</p>
        <h3 className="mt-4 text-sm font-semibold text-ink-muted">{money.officialLinks}</h3>
        <ul className="mt-1 space-y-1">
          {links.map((link) => (
            <li key={link.url}>
              <a href={link.url} className="font-medium break-all underline underline-offset-4">
                {link.label}
              </a>
              <span className="hidden text-sm text-ink-muted print:block">{link.url}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 space-y-2 rounded-2xl bg-surface-muted p-4">
          {words.fixedLines.map((line) => (
            <p key={line} className="text-base font-semibold">
              {line}
            </p>
          ))}
        </div>
        <p className="mt-3 text-sm text-ink-muted">
          {money.checkedOn(day(`${CHECKED_ON}T12:00:00+05:30`))}
        </p>
      </Part>

      <p className="mt-10 border-t border-border pt-4 text-sm text-ink-muted">
        {text.noNames} {text.footer}
      </p>
    </main>
  );
}

function Part({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="mt-8 break-inside-avoid">
      <h2 className="text-2xl font-extrabold tracking-tight">{title}</h2>
      {note && <p className="text-base text-ink-muted">{note}</p>}
      <div className="mt-3 text-base">{children}</div>
    </section>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="font-semibold whitespace-nowrap tabular-nums">{value}</dd>
    </div>
  );
}

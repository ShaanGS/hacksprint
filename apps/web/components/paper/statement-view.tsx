import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { moneyTextFor } from "@/lib/i18n/money";
import { paperTextFor, type PaperLang } from "@/lib/i18n/paper";
import { formatMoney } from "@/lib/money";
import type { SourceLabel } from "@/lib/rotation/labels";
import type { StatementRow } from "@/lib/rotation/statement";
import type { StoredStatement } from "@/lib/statement/load";

// The statement's two blocks (D1, D2), on the statement page and in the loan pack. Every number
// opens the rows behind it on screen; printed, the page shows the totals.

type Words = { text: ReturnType<typeof paperTextFor>; locale: string; lang: PaperLang };

export function StatementView({ payload, lang }: { payload: StoredStatement; lang: PaperLang }) {
  const words: Words = {
    text: paperTextFor(lang),
    locale: lang === "ta" ? "ta-IN" : "en-IN",
    lang,
  };
  const { text } = words;
  const { months, verified, declared } = payload.blocks;
  const month = (value: string) =>
    new Date(`${value}-01T12:00:00+05:30`).toLocaleDateString(words.locale, {
      month: "short",
      year: "numeric",
    });
  const monthly = (
    name: string,
    metric: { label: SourceLabel; byMonth: number[]; rows: StatementRow[] },
    extra?: ReactNode,
  ) => (
    <Metric name={name} label={metric.label} rows={metric.rows} words={words} extra={extra}>
      <div className="grid grid-cols-3 gap-2">
        {metric.byMonth.map((paise, index) => (
          <p key={months[index]} className="text-right">
            <span className="block text-xs text-ink-muted sm:hidden">{month(months[index])}</span>
            <span className="text-base font-semibold tabular-nums">{formatMoney(paise)}</span>
          </p>
        ))}
      </div>
    </Metric>
  );
  const single = (name: string, label: SourceLabel, value: string, rows?: StatementRow[]) => (
    <Metric name={name} label={label} rows={rows ?? []} words={words}>
      <p className="text-right text-base font-semibold tabular-nums">{value}</p>
    </Metric>
  );

  return (
    <div className="space-y-8">
      <p className="text-base">{text.intro}</p>
      <Block title={text.verified} note={text.verifiedText} months={months.map(month)}>
        {monthly(text.metrics.digitalPayments, verified.digitalPayments)}
        {monthly(
          text.metrics.creditRecoveredByLink,
          verified.creditRecoveredByLink,
          verified.creditRecoveredByLink.medianDays !== null &&
            text.medianDays(verified.creditRecoveredByLink.medianDays),
        )}
        {monthly(
          text.metrics.supplierBills,
          verified.supplierBills,
          verified.supplierBills.count.map((count) => text.bills(count)).join(" · "),
        )}
      </Block>
      <Block title={text.declared} note={text.declaredText} months={months.map(month)}>
        {monthly(text.metrics.cashSales, declared.cashSales)}
        {monthly(text.metrics.creditGiven, declared.creditGiven)}
        {monthly(text.metrics.creditRecoveredCash, declared.creditRecoveredCash)}
        {single(
          text.metrics.billsPaidOnTime,
          declared.billsPaidOnTime.label,
          declared.billsPaidOnTime.percent === null
            ? text.notEnough
            : text.percentOf(declared.billsPaidOnTime.percent, declared.billsPaidOnTime.bills),
          declared.billsPaidOnTime.rows,
        )}
        {single(
          text.metrics.regularCreditCustomers,
          declared.regularCreditCustomers.label,
          text.customers(declared.regularCreditCustomers.count),
        )}
        {single(
          text.metrics.averageStockValue,
          declared.averageStockValue.label,
          declared.averageStockValue.paise === null
            ? text.notEnough
            : formatMoney(declared.averageStockValue.paise),
          declared.averageStockValue.rows,
        )}
        {single(
          text.metrics.moneyCycleDays,
          declared.moneyCycleDays.label,
          declared.moneyCycleDays.days === null
            ? text.notEnough
            : text.days(Math.round(declared.moneyCycleDays.days)),
        )}
      </Block>
    </div>
  );
}

function Block({
  title,
  note,
  months,
  children,
}: {
  title: string;
  note: string;
  months: string[];
  children: ReactNode;
}) {
  return (
    <section className="break-inside-avoid">
      <h2 className="text-2xl font-extrabold tracking-tight">{title}</h2>
      <p className="text-base text-ink-muted">{note}</p>
      <div className="mt-3 hidden grid-cols-5 gap-2 border-b border-border pb-2 text-sm font-semibold text-ink-muted sm:grid">
        <span className="col-span-2" />
        {months.map((month) => (
          <span key={month} className="text-right">
            {month}
          </span>
        ))}
      </div>
      <ul className="divide-y divide-border">{children}</ul>
    </section>
  );
}

function Metric({
  name,
  label,
  rows,
  words,
  extra,
  children,
}: {
  name: string;
  label: SourceLabel;
  rows: StatementRow[];
  words: Words;
  extra?: ReactNode;
  children: ReactNode;
}) {
  const labels = moneyTextFor(words.lang).labels;
  return (
    <li className="py-3">
      <div className="gap-2 sm:grid sm:grid-cols-5 sm:items-baseline">
        <div className="sm:col-span-2">
          <p className="text-base font-semibold">{name}</p>
          <p className="mt-1 flex flex-wrap items-center gap-2">
            <Badge tone={label === "verified_payment" ? "success" : "neutral"}>
              {labels[label]}
            </Badge>
            {extra && <span className="text-sm text-ink-muted">{extra}</span>}
          </p>
        </div>
        <div className="mt-2 sm:col-span-3 sm:mt-0">{children}</div>
      </div>
      {rows.length > 0 && <Rows rows={rows} words={words} />}
    </li>
  );
}

/** The rows behind a number: tap to open on screen; left out of the printed page. */
function Rows({ rows, words }: { rows: StatementRow[]; words: Words }) {
  const { text, locale } = words;
  const day = (date: string) =>
    date.length === 7
      ? `${text.monthEnd}, ${new Date(`${date}-01T12:00:00+05:30`).toLocaleDateString(locale, { month: "short", year: "numeric" })}`
      : new Date(`${date}T12:00:00+05:30`).toLocaleDateString(locale, {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
  return (
    <details className="group mt-2 print:hidden">
      <summary className="flex min-h-11 cursor-pointer list-none items-center text-sm font-semibold underline underline-offset-4">
        {text.seeRows(rows.length)}
      </summary>
      <ul className="mt-1 max-h-80 overflow-y-auto rounded-xl bg-surface-muted px-3 py-1">
        {rows.map((row, index) => (
          <li key={index} className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
            <span className="text-ink-muted">
              {day(row.date)}
              {row.late !== undefined && (
                <span className={cn("ml-2 font-medium", row.late ? "text-danger" : "text-success")}>
                  {row.late ? text.paidLate : text.paidOnTime}
                </span>
              )}
            </span>
            <span className="font-medium tabular-nums">{formatMoney(row.paise)}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}

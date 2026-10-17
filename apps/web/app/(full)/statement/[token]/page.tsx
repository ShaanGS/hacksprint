import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { PaperHeader } from "@/components/paper/paper-header";
import { StatementView } from "@/components/paper/statement-view";
import { paperLang, paperTextFor } from "@/lib/i18n/paper";
import { loadStatement } from "@/lib/statement/load";
import { createServiceClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Shop statement", robots: { index: false } };

/**
 * D2: the frozen statement behind a share link, in Tamil or English, printed to PDF by the
 * browser. Totals only; anyone with the link sees it, so it never holds a customer's name.
 */
export default async function StatementPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ lang?: string | string[] }>;
}) {
  await connection();
  const [{ token }, query] = await Promise.all([params, searchParams]);
  const payload = await loadStatement(createServiceClient(), token);
  if (!payload) notFound();
  const lang = paperLang(query.lang);
  const text = paperTextFor(lang);
  const locale = lang === "ta" ? "ta-IN" : "en-IN";
  const month = (date: string) =>
    new Date(`${date}T12:00:00+05:30`).toLocaleDateString(locale, {
      month: "long",
      year: "numeric",
    });
  const made = new Date(payload.generated_at).toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
  return (
    <main className="mx-auto max-w-3xl px-4 py-6 print:max-w-none print:p-0">
      <PaperHeader
        kind={text.statement}
        shop={payload.shop}
        lines={[
          text.period(month(payload.period.from), month(payload.period.to)),
          text.madeOn(made),
        ]}
        demo={payload.demo_data}
        lang={lang}
      />
      <div className="mt-6">
        <StatementView payload={payload} lang={lang} />
      </div>
      <p className="mt-10 border-t border-border pt-4 text-sm text-ink-muted">{text.footer}</p>
    </main>
  );
}

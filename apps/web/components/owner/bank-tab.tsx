"use client";

import { FileText } from "lucide-react";
import { useRef, useState } from "react";
import { useLive } from "@/components/owner/live";
import { LoanCheck } from "@/components/owner/loan-check";
import { useOwnerLanguage } from "@/components/owner/owner-language";
import { useOwnerScreen } from "@/components/owner/owner-screen";
import { RepaymentPlanner } from "@/components/owner/repayment-planner";
import { SchemesSection } from "@/components/owner/schemes-section";
import { Section } from "@/components/owner/section";
import { useDates } from "@/components/owner/use-dates";
import { Amount } from "@/components/ui/amount";
import { Art } from "@/components/ui/art";
import { Badge } from "@/components/ui/badge";
import { Button, LinkButton } from "@/components/ui/button";
import { ListRow } from "@/components/ui/list-row";
import { Sheet } from "@/components/ui/sheet";
import { formatMoney } from "@/lib/money";
import { ownerApi, type Payable } from "@/lib/owner/api";

/**
 * Screen D · Savings & EMI (owner)
 * Lilac #b9a7f5 panel on black. Shows EMI kept-aside progress, buttons "+ Keep ₹X", "Collect dues", "Schemes".
 * Ported schemes-section and repayment-planner. Never moves money. Footer: "Munim never moves your money."
 */
export function BankTab({ onCollect }: { onCollect: () => void }) {
  const { lang, text } = useOwnerLanguage();
  const isTa = lang === "ta";
  const { notify } = useOwnerScreen();
  const dates = useDates();
  const payables = useLive(ownerApi.payables, ["rotation"]);
  const costs = useLive(ownerApi.costs, ["rotation"]);
  const [statementUrl, setStatementUrl] = useState<string | null>(null);
  const [paying, setPaying] = useState<Payable | null>(null);
  const [busy, setBusy] = useState(false);

  const schemesRef = useRef<HTMLDivElement>(null);

  const scrollToSchemes = () => {
    schemesRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  async function makeStatement() {
    setBusy(true);
    try {
      setStatementUrl((await ownerApi.statement()).share_url);
    } catch {
      notify(text.failed);
    } finally {
      setBusy(false);
    }
  }

  async function paid(payable: Payable, via: "cash" | "bank" | "upi") {
    setBusy(true);
    try {
      await ownerApi.payablePaid(payable.id, via);
      notify(text.billPaid(payable.distributor));
      setPaying(null);
      payables.reload();
    } catch {
      notify(text.failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-full bg-black px-4 pt-3 pb-44 text-white">
      {/* Screen D Top Profile Bar (Murugan avatar) */}
      <div className="flex items-center gap-3 py-2">
        <div className="grid size-11 place-items-center rounded-full bg-[#b9a7f5] text-base font-black text-black">
          M
        </div>
        <div>
          <h1 className="text-lg font-black leading-tight text-white">
            {isTa ? "வணக்கம், முருகன்" : "Hi, Murugan"}
          </h1>
          <p className="text-xs font-semibold text-neutral-400">
            {isTa ? "உங்கள் கடை சேமிப்பு" : "Your shop savings"}
          </p>
        </div>
      </div>

      {/* Screen D Lilac Panel + EMI planner */}
      <div className="mt-3">
        <RepaymentPlanner onCollect={onCollect} onSchemes={scrollToSchemes} />
      </div>

      {/* Loan readiness check */}
      <div className="mt-6">
        <LoanCheck onCollect={onCollect} />
      </div>

      {/* Statement generation */}
      <section className="mt-4 rounded-3xl bg-[#1c1c1e] border border-white/5 p-4 text-white">
        <div className="flex items-start gap-3">
          <Art name="bill" size={56} />
          <div className="min-w-0 flex-1">
            <p className="text-lg font-bold text-white">{text.statementTitle}</p>
            <p className="text-sm text-neutral-400">{text.statementText}</p>
          </div>
        </div>
        <div className="mt-3">
          {statementUrl ? (
            <LinkButton
              wide
              href={`${statementUrl}?lang=${lang === "ta" ? "ta" : "en"}`}
              target="_blank"
              rel="noopener"
              className="bg-[#c8e26a] text-black font-bold"
            >
              <FileText aria-hidden className="size-5" />
              {text.openStatement}
            </LinkButton>
          ) : (
            <Button
              wide
              variant="soft"
              disabled={busy}
              onClick={makeStatement}
              className="bg-white/10 text-white hover:bg-white/15"
            >
              <FileText aria-hidden className="size-5" />
              {text.makeStatement}
            </Button>
          )}
        </div>
      </section>

      {/* Supplier Dues */}
      {payables.data && (
        <div className="mt-6">
          <Section title={text.duesTitle} total={payables.data.total_paise}>
            {payables.data.payables.length === 0 ? (
              <li className="px-3 py-4 text-base text-neutral-400">{text.noDues}</li>
            ) : (
              payables.data.payables.map((payable) => (
                <li key={payable.id}>
                  <ListRow
                    art={<Art name="bill" size={44} />}
                    tag={
                      payable.overdue_days > 0 ? (
                        <Badge tone="danger">{text.overdueBy(payable.overdue_days)}</Badge>
                      ) : payable.festival_order ? (
                        <Badge>{text.festivalBadge}</Badge>
                      ) : undefined
                    }
                    title={[payable.distributor, payable.bill_number].filter(Boolean).join(" · ")}
                    meta={text.dueOn(dates.day(payable.due_date))}
                    trailing={<Amount paise={payable.amount_paise} size="md" />}
                    onClick={() => setPaying(payable)}
                  />
                </li>
              ))
            )}
          </Section>
        </div>
      )}

      {/* Weekly Costs */}
      {costs.data && (
        <div className="mt-6">
          <Section
            title={text.costsTitle}
            note={text.weekTotal(formatMoney(costs.data.weekly_paise))}
          >
            {costs.data.costs.map((cost) => (
              <li key={cost.kind}>
                <ListRow
                  art={<Art name="coins" size={44} />}
                  title={text.costs[cost.kind]}
                  meta={text.costAmount(formatMoney(cost.amount_paise), cost.period)}
                />
              </li>
            ))}
          </Section>
        </div>
      )}

      {/* Government Schemes Section */}
      <div ref={schemesRef} className="mt-6">
        <SchemesSection />
      </div>

      {/* Payment Sheet */}
      <Sheet
        open={paying !== null}
        onOpenChange={(open) => !open && setPaying(null)}
        title={text.paidThisBill}
        description={
          paying ? [paying.distributor, paying.bill_number].filter(Boolean).join(" · ") : undefined
        }
        footer={
          paying && (
            <div className="space-y-2 pb-3">
              {(["cash", "bank", "upi"] as const).map((via) => (
                <Button
                  key={via}
                  wide
                  variant={via === "bank" ? "primary" : "soft"}
                  disabled={busy}
                  onClick={() => paid(paying, via)}
                >
                  {text.paidVia[via]}
                </Button>
              ))}
            </div>
          )
        }
      >
        {paying && (
          <div className="text-center">
            <Amount paise={paying.amount_paise} size="hero" className="block" />
            <p className="mt-1 text-base text-ink-muted">
              {text.dueOn(dates.day(paying.due_date))}
            </p>
          </div>
        )}
      </Sheet>
    </main>
  );
}

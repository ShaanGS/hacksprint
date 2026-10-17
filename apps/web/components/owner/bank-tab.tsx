"use client";

import { FileText } from "lucide-react";
import { useState } from "react";
import { useLive } from "@/components/owner/live";
import { LoanCheck } from "@/components/owner/loan-check";
import { useOwnerLanguage } from "@/components/owner/owner-language";
import { useOwnerScreen } from "@/components/owner/owner-screen";
import { RepaymentPlanner } from "@/components/owner/repayment-planner";
import { SchemesSection } from "@/components/owner/schemes-section";
import { Section } from "@/components/owner/section";
import { TabHeader } from "@/components/owner/tab-header";
import { useDates } from "@/components/owner/use-dates";
import { Amount } from "@/components/ui/amount";
import { Art } from "@/components/ui/art";
import { Badge } from "@/components/ui/badge";
import { Button, LinkButton } from "@/components/ui/button";
import { ListRow } from "@/components/ui/list-row";
import { Sheet } from "@/components/ui/sheet";
import { formatMoney } from "@/lib/money";
import { ownerApi, type Payable } from "@/lib/owner/api";
import type { DaySummary } from "@/lib/owner/types";

/**
 * D1 to D4 and the setup behind the week (B7): the loan check, the statement for the bank,
 * what is owed to suppliers, and the weekly costs he said.
 */
export function BankTab({
  onCollect,
  shopName = "Lakshmi Stores",
}: {
  onCollect: () => void;
  shopName?: string;
}) {
  const { lang, text } = useOwnerLanguage();
  const { notify } = useOwnerScreen();
  const dates = useDates();
  const payables = useLive(ownerApi.payables, ["rotation"]);
  const costs = useLive(ownerApi.costs, ["rotation"]);
  const [statementUrl, setStatementUrl] = useState<string | null>(null);
  const [paying, setPaying] = useState<Payable | null>(null);
  const [busy, setBusy] = useState(false);

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
    <main className="px-4 pt-2 pb-44">
      <TabHeader title={text.bankTitle} />
      <LoanCheck onCollect={onCollect} />

      <section className="mt-4 rounded-2xl bg-surface-muted p-4">
        <div className="flex items-start gap-3">
          <Art name="bill" size={56} />
          <div className="min-w-0 flex-1">
            <p className="text-lg font-bold">{text.statementTitle}</p>
            <p className="text-sm text-ink-muted">{text.statementText}</p>
          </div>
        </div>
        <div className="mt-3">
          {statementUrl ? (
            <LinkButton
              wide
              href={`${statementUrl}?lang=${lang === "ta" ? "ta" : "en"}`}
              target="_blank"
              rel="noopener"
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
              className="bg-surface"
            >
              <FileText aria-hidden className="size-5" />
              {text.makeStatement}
            </Button>
          )}
        </div>
      </section>

      {payables.data && (
        <Section title={text.duesTitle} total={payables.data.total_paise}>
          {payables.data.payables.length === 0 ? (
            <li className="px-3 py-4 text-base text-ink-muted">{text.noDues}</li>
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
      )}

      {costs.data && (
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
      )}

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

      {(() => {
        const summary: DaySummary = {
          orders: 14,
          collectedPaise: 1840000,
          creditPaise: 240000,
          owedPaise: payables.data ? payables.data.total_paise : 2840000,
        };
        return (
          <>
            <RepaymentPlanner summary={summary} />
            <SchemesSection shopName={shopName} summary={summary} />
          </>
        );
      })()}
    </main>
  );
}

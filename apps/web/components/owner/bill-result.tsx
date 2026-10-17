"use client";

import { Check, PackageX, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";
import { useOwnerLanguage } from "@/components/owner/owner-language";
import { Art, toArtName } from "@/components/ui/art";
import { Badge } from "@/components/ui/badge";
import type { BillIssue, BillOutcome } from "@/lib/bills/types";
import { formatMoney } from "@/lib/money";

/**
 * After the bill went in: what did not come (spec B4) and what got dearer (B3) first, since they
 * need the owner; then every shelf the delivery filled (B2).
 */
export function BillResult({
  outcome,
  distributor,
}: {
  outcome: BillOutcome;
  distributor: string;
}) {
  const { text } = useOwnerLanguage();
  const short = outcome.issues.filter((issue) => issue.type !== "price_up");
  const dearer = outcome.issues.filter((issue) => issue.type === "price_up");

  return (
    <div className="space-y-5">
      <p className="flex items-center gap-3 rounded-2xl bg-tint-mint p-3 text-base font-semibold">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-success text-accent-ink">
          <Check aria-hidden className="size-5" strokeWidth={3} />
        </span>
        {text.addedText(formatMoney(outcome.totalPaise), distributor)}
      </p>

      {short.length > 0 && (
        <Section title={text.missingTitle} icon={<PackageX aria-hidden className="size-5" />}>
          {short.map((issue) => (
            <IssueRow key={issue.productId} issue={issue} />
          ))}
        </Section>
      )}
      {dearer.length > 0 && (
        <Section title={text.priceUpTitle} icon={<TrendingUp aria-hidden className="size-5" />}>
          {dearer.map((issue) => (
            <IssueRow key={issue.productId} issue={issue} />
          ))}
        </Section>
      )}
      {outcome.issues.length === 0 && (
        <p className="text-base font-medium text-success">{text.allCame}</p>
      )}

      <ul className="space-y-1">
        {outcome.stock.map((change, index) => (
          <li key={`${change.productId}-${index}`} className="flex items-center gap-3">
            <Art name={toArtName(change.art)} size={44} />
            <span className="min-w-0 flex-1 truncate text-base">{change.name}</span>
            <span className="text-sm font-semibold text-success tabular-nums">
              {text.stockAdded(String(change.added))}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-tint-sand p-3">
      <h3 className="flex items-center gap-2 text-base font-bold">
        {icon}
        {title}
      </h3>
      <ul className="mt-2 space-y-2">{children}</ul>
    </section>
  );
}

function IssueRow({ issue }: { issue: BillIssue }) {
  const { text } = useOwnerLanguage();
  const line =
    issue.type === "missing"
      ? text.orderedGot(issue.ordered, 0)
      : issue.type === "qty_mismatch"
        ? text.orderedGot(issue.ordered, issue.received)
        : text.priceUp(
            formatMoney(issue.oldCostPaise),
            formatMoney(issue.newCostPaise),
            issue.percent,
          );
  return (
    <li className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-base font-semibold">{issue.name}</p>
        <p className="text-sm text-ink-muted tabular-nums">{line}</p>
      </div>
      {issue.type === "price_up" ? (
        <Badge tone="warning">+{issue.percent}%</Badge>
      ) : (
        <Badge tone="danger">{issue.type === "missing" ? "0" : issue.received}</Badge>
      )}
    </li>
  );
}

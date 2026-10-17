"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useOwnerLanguage } from "@/components/owner/owner-language";
import { SourceBadge } from "@/components/owner/source-badge";
import { useDates } from "@/components/owner/use-dates";
import { Amount } from "@/components/ui/amount";
import { Art, toArtName } from "@/components/ui/art";
import { ListRow } from "@/components/ui/list-row";
import { Monogram } from "@/components/ui/monogram";
import { Sheet } from "@/components/ui/sheet";
import { formatMoney } from "@/lib/money";
import { ownerApi, type SourceRows } from "@/lib/owner/api";
import type { RotationPart, SourceRow } from "@/lib/rotation/sources";
import type { PriceSource } from "@/lib/sources/types";

/**
 * Rule 5: the rows behind a number on the money screens, and what they add up to, which is the
 * number tapped. Each row says where it came from.
 */
export function RotationSourceSheet({
  part,
  onClose,
}: {
  part: RotationPart | null;
  onClose: () => void;
}) {
  const { text } = useOwnerLanguage();
  const [source, setSource] = useState<SourceRows | null>(null);

  useEffect(() => {
    if (!part) return;
    let current = true;
    ownerApi.source(part).then(
      (next) => {
        if (current) setSource(next);
      },
      () => {
        if (current) onClose();
      },
    );
    return () => {
      current = false;
      setSource(null);
    };
  }, [part, onClose]);

  const usualWeek = part === "usual_week_sales";
  return (
    <Sheet
      open={part !== null}
      onOpenChange={(open) => !open && onClose()}
      title={part ? text.parts[part] : ""}
      footer={
        source && (
          <div className="pb-3">
            <p className="flex items-baseline justify-between text-lg font-bold">
              {usualWeek ? text.usualWeek : text.addsUpTo}
              <Amount paise={source.total_paise} size="xl" />
            </p>
            {usualWeek && <p className="text-sm text-ink-muted">{text.usualWeekNote}</p>}
          </div>
        )
      }
    >
      {!source ? (
        <div className="grid h-32 place-items-center">
          <Art name="clock" size={72} />
        </div>
      ) : source.rows.length === 0 ? (
        <p className="py-8 text-center text-base text-ink-muted">{text.nothingHere}</p>
      ) : (
        <ul className="-mx-3">
          {source.rows.map((row, index) => (
            <li key={index}>
              <SourceRowView row={row} />
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}

function SourceRowView({ row }: { row: SourceRow }) {
  const { text } = useOwnerLanguage();
  const dates = useDates();
  const shown = (() => {
    switch (row.kind) {
      case "bill":
        return {
          art: <Art name="bill" size={44} />,
          title: [row.distributor, row.bill_number].filter(Boolean).join(" · "),
          meta:
            row.overdue_days > 0
              ? text.overdueBy(row.overdue_days)
              : text.dueOn(dates.day(row.due_date)),
        };
      case "cost":
        return {
          art: <Art name="coins" size={44} />,
          title: text.costs[row.cost as keyof typeof text.costs] ?? row.cost,
          meta: row.period === "month" ? text.perMonth : text.perWeek,
        };
      case "money_in_hand":
        return {
          art: <Art name="savings" size={44} />,
          title: text.moneyInHandSaid,
          meta: dates.dayAndTime(row.at),
        };
      case "payment":
        return {
          art: <Art name="phone-pay" size={44} />,
          title: text.paymentIn,
          meta: dates.dayAndTime(row.at),
        };
      case "day_sales":
        return {
          art: <Art name="coins" size={44} />,
          title: dates.weekday(row.date),
          meta: text.daySales,
        };
      case "customer":
        return {
          art: <Monogram name={row.name} />,
          title: row.name,
          meta: `${text.status[row.status]} · ${text.owesSince(dates.day(row.oldest_unpaid))}`,
        };
      case "product":
        return {
          art: <Art name={toArtName(row.art)} size={44} />,
          title: row.name,
          meta: row.counted_at ? text.countedOn(dates.day(row.counted_at)) : text.notCounted,
        };
    }
  })();
  return (
    <ListRow
      art={shown.art}
      title={shown.title}
      meta={shown.meta}
      note={<SourceBadge label={row.label} />}
      trailing={<Amount paise={row.paise} size="md" />}
    />
  );
}

/**
 * Where a cost came from (rule 5): the bill line that printed it, what the shop paid, and the
 * bill's photo.
 */
export function PriceSheet({
  productId,
  onClose,
}: {
  productId: string | null;
  onClose: () => void;
}) {
  const { text } = useOwnerLanguage();
  const dates = useDates();
  const [source, setSource] = useState<PriceSource | null>(null);

  useEffect(() => {
    if (!productId) return;
    let current = true;
    ownerApi.priceSource(productId).then(
      (next) => {
        if (current) setSource(next);
      },
      () => {
        if (current) onClose();
      },
    );
    return () => {
      current = false;
      setSource(null);
    };
  }, [productId, onClose]);

  const bill = source?.bill;
  return (
    <Sheet
      open={productId !== null}
      onOpenChange={(next) => !next && onClose()}
      title={text.priceTitle}
      description={source?.name}
    >
      {!source ? (
        <div className="grid h-32 place-items-center">
          <Art name="clock" size={72} />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Art name={toArtName(source.art)} size={64} />
            <Amount paise={source.pricePaise} size="xl" />
          </div>
          {bill ? (
            <section className="rounded-2xl bg-surface-muted p-4">
              <p className="text-base font-bold">{bill.distributor}</p>
              <p className="text-sm text-ink-muted">
                {[bill.billNumber, dates.day(bill.billedOn)].filter(Boolean).join(" · ")}
              </p>
              {bill.mrpPaise !== null && (
                <p className="mt-3 text-base">{text.priceOnBill(formatMoney(bill.mrpPaise))}</p>
              )}
              {bill.unitCostPaise !== null && (
                <p className="mt-1 text-base font-semibold">
                  {text.youPaid(formatMoney(bill.unitCostPaise))}
                </p>
              )}
              {bill.photoUrl && (
                <Image
                  src={bill.photoUrl}
                  alt=""
                  width={640}
                  height={640}
                  unoptimized
                  className="mt-3 h-auto max-h-80 w-full rounded-xl object-contain"
                />
              )}
            </section>
          ) : (
            <p className="text-base text-ink-muted">{text.noBill}</p>
          )}
        </div>
      )}
    </Sheet>
  );
}

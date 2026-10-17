"use client";

import Image from "next/image";
import { useOwnerLanguage } from "@/components/owner/owner-language";
import { Amount } from "@/components/ui/amount";
import { Art, toArtName } from "@/components/ui/art";
import { ListRow } from "@/components/ui/list-row";
import { Monogram } from "@/components/ui/monogram";
import { Sheet } from "@/components/ui/sheet";
import { langInfo } from "@/lib/i18n/languages";
import { formatMoney } from "@/lib/money";
import type { HomeSource, HomeSourceKind, PriceSource } from "@/lib/sources/types";

function useDates() {
  const { lang } = useOwnerLanguage();
  const locale = langInfo[lang].sarvamCode;
  return {
    time: (iso: string) =>
      new Date(iso).toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" }),
    day: (iso: string) =>
      new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "short" }),
  };
}

/**
 * E3: the rows behind a home number, and what they add up to, which is the number tapped. The
 * owner can check any number against the orders, payments, credit or bills it came from.
 */
export function SourceSheet({
  kind,
  source,
  onClose,
}: {
  kind: HomeSourceKind | null;
  source: HomeSource | null;
  onClose: () => void;
}) {
  const { text } = useOwnerLanguage();
  return (
    <Sheet
      open={kind !== null}
      onOpenChange={(open) => !open && onClose()}
      title={kind ? text.sourceTitles[kind] : ""}
      footer={
        source && (
          <p className="flex items-baseline justify-between text-lg font-bold">
            {text.addsUpTo}
            <Amount paise={source.totalPaise} size="xl" />
          </p>
        )
      }
    >
      {!source ? (
        <div className="grid h-32 place-items-center">
          <Art name="clock" size={72} />
        </div>
      ) : source.rows.length === 0 ? (
        <p className="py-8 text-center text-base text-ink-muted">{text.nothingYet}</p>
      ) : (
        <ul className="-mx-3">
          <Rows source={source} />
        </ul>
      )}
    </Sheet>
  );
}

function Rows({ source }: { source: HomeSource }) {
  const { text } = useOwnerLanguage();
  const dates = useDates();
  switch (source.kind) {
    case "orders":
      return source.rows.map((row) => (
        <li key={row.orderNumber}>
          <ListRow
            art={<Monogram name={row.customer} />}
            title={row.customer}
            meta={`#${row.orderNumber} · ${dates.time(row.at)}`}
            trailing={<Amount paise={row.amountPaise} size="md" />}
          />
        </li>
      ));
    case "collected":
      return source.rows.map((row) => (
        <li key={`${row.orderNumber}-${row.at}`}>
          <ListRow
            art={<Monogram name={row.customer} />}
            title={row.customer}
            meta={[
              `#${row.orderNumber}`,
              dates.time(row.at),
              row.reference && text.reference(row.reference),
            ]
              .filter(Boolean)
              .join(" · ")}
            trailing={<Amount paise={row.amountPaise} size="md" />}
          />
        </li>
      ));
    case "owed-to-shop":
      return source.rows.map((row) => (
        <li key={row.customer}>
          <ListRow
            art={<Monogram name={row.customer} />}
            title={row.customer}
            trailing={<Amount paise={row.amountPaise} size="md" />}
          />
        </li>
      ));
    case "owed-by-shop":
      return source.rows.map((row) => (
        <li key={`${row.distributor}-${row.billNumber}`}>
          <ListRow
            art={<Art name="crate" size={44} />}
            title={row.distributor}
            meta={[row.billNumber, text.due(dates.day(row.due))].filter(Boolean).join(" · ")}
            trailing={<Amount paise={row.amountPaise} size="md" />}
          />
        </li>
      ));
  }
}

/** E3 for a price: the bill line that printed it, what the shop paid, and the bill's photo. */
export function PriceSheet({
  open,
  source,
  onClose,
}: {
  open: boolean;
  source: PriceSource | null;
  onClose: () => void;
}) {
  const { text } = useOwnerLanguage();
  const dates = useDates();
  const bill = source?.bill;
  return (
    <Sheet
      open={open}
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

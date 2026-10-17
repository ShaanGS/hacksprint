"use client";

import { AlertTriangle, Undo2 } from "lucide-react";
import type { ReactNode } from "react";
import { useOwnerLanguage } from "@/components/owner/owner-language";
import { Amount } from "@/components/ui/amount";
import { Art, toArtName } from "@/components/ui/art";
import { ListRow } from "@/components/ui/list-row";
import { QtyStepper } from "@/components/ui/qty-stepper";
import { cn } from "@/lib/cn";
import { lineAgrees, lineReady } from "@/lib/bills/match";
import type { ScannedBill, ScannedLine } from "@/lib/bills/types";
import type { Product } from "@/lib/catalog";
import { langInfo } from "@/lib/i18n/languages";
import { formatMoney } from "@/lib/money";
import { lineTotalPaise } from "@/lib/orders/totals";

export type CheckLine = ScannedLine & { included: boolean };

/** The total of the lines going in, worked out here from quantity and rate. */
export function checkedTotal(lines: CheckLine[]): number {
  return lines
    .filter((line) => line.included && line.qty !== null && line.unitCostPaise !== null)
    .reduce(
      (total, line) =>
        total + lineTotalPaise({ qty: line.qty ?? 0, unitPricePaise: line.unitCostPaise ?? 0 }),
      0,
    );
}

/** The bill can go in: a distributor, at least one line, and every line in it complete. */
export function canConfirm(bill: ScannedBill, lines: CheckLine[], distributorId: string | null) {
  const going = lines.filter((line) => line.included);
  return (
    distributorId !== null &&
    bill.alreadyAddedOn === null &&
    going.length > 0 &&
    going.every(lineReady)
  );
}

/**
 * The bill as read, for the owner to check by tapping (spec B1, rule 7: no typing). A line the
 * photo did not match gets "Which product?"; a quantity that disagrees with the printed amount
 * is flagged and fixed with the stepper; a line can be left out and put back.
 */
export function BillCheck({
  bill,
  lines,
  products,
  distributorId,
  onDistributor,
  onQty,
  onInclude,
  onPick,
}: {
  bill: ScannedBill;
  lines: CheckLine[];
  products: Product[];
  distributorId: string | null;
  onDistributor: (id: string) => void;
  onQty: (index: number, qty: number) => void;
  onInclude: (index: number, included: boolean) => void;
  onPick: (index: number) => void;
}) {
  const { lang, text } = useOwnerLanguage();
  const total = checkedTotal(lines);
  const allIn = lines.every((line) => line.included);
  const totalDiffers =
    allIn && bill.printedTotalPaise !== null && Math.abs(total - bill.printedTotalPaise) > 100;

  return (
    <div className="space-y-4">
      {bill.alreadyAddedOn && (
        <Note tone="danger">
          {text.alreadyAdded(
            new Date(bill.alreadyAddedOn).toLocaleDateString(langInfo[lang].sarvamCode, {
              day: "numeric",
              month: "long",
            }),
          )}
        </Note>
      )}

      {bill.distributorId === null && (
        <section>
          <h3 className="text-base font-bold">{text.whichDistributor}</h3>
          <p className="text-sm text-ink-muted">{text.onTheBill(bill.printedDistributor)}</p>
          <div className="-mx-3 mt-1">
            {bill.distributors.map((distributor) => (
              <ListRow
                key={distributor.id}
                title={distributor.name}
                selected={distributorId === distributor.id}
                onClick={() => onDistributor(distributor.id)}
              />
            ))}
          </div>
        </section>
      )}

      <ul className="divide-y divide-border">
        {lines.map((line, index) => (
          <li key={index} className={cn("py-3", !line.included && "opacity-50")}>
            <Line
              line={line}
              product={products.find((p) => p.id === line.productId) ?? null}
              onQty={(qty) => onQty(index, qty)}
              onInclude={(included) => onInclude(index, included)}
              onPick={() => onPick(index)}
            />
          </li>
        ))}
      </ul>

      {totalDiffers && bill.printedTotalPaise !== null && (
        <Note tone="warning">{text.billSays(formatMoney(bill.printedTotalPaise))}</Note>
      )}
    </div>
  );
}

function Line({
  line,
  product,
  onQty,
  onInclude,
  onPick,
}: {
  line: CheckLine;
  product: Product | null;
  onQty: (qty: number) => void;
  onInclude: (included: boolean) => void;
  onPick: () => void;
}) {
  const { text } = useOwnerLanguage();
  const readable = line.qty !== null && line.unitCostPaise !== null;
  const meta = [
    line.unitCostPaise !== null && `${formatMoney(line.unitCostPaise)} × ${line.qty ?? "?"}`,
    line.mrpPaise !== null && `MRP ${formatMoney(line.mrpPaise)}`,
  ]
    .filter(Boolean)
    .join(" · ");

  if (!line.included) {
    return (
      <div className="flex items-center gap-3">
        <span className="min-w-0 flex-1 truncate text-base line-through">{line.printedName}</span>
        <button
          type="button"
          onClick={() => onInclude(true)}
          className="flex min-h-11 items-center gap-1.5 rounded-full bg-surface-muted px-4 text-sm font-semibold"
        >
          <Undo2 aria-hidden className="size-4" />
          {text.putBack}
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        <Art name={toArtName(product?.art ?? "bag")} size={48} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold">{product?.name ?? line.printedName}</p>
          <p className="truncate text-sm text-ink-muted tabular-nums">{meta}</p>
        </div>
        {readable && (
          <Amount
            paise={lineTotalPaise({ qty: line.qty ?? 0, unitPricePaise: line.unitCostPaise ?? 0 })}
            size="md"
          />
        )}
      </div>
      {product && line.printedName !== product.name && (
        <p className="mt-1 pl-15 text-xs text-ink-muted">{text.onTheBill(line.printedName)}</p>
      )}
      <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
        {!product && (
          <button
            type="button"
            onClick={onPick}
            className="min-h-11 rounded-full bg-accent px-4 text-sm font-semibold text-accent-ink"
          >
            {text.whichProduct}
          </button>
        )}
        {readable ? (
          <QtyStepper
            value={String(line.qty)}
            removes={line.qty === 1}
            onMinus={() => (line.qty === 1 ? onInclude(false) : onQty((line.qty ?? 1) - 1))}
            onPlus={() => onQty((line.qty ?? 0) + 1)}
            minusLabel={text.lessOne}
            plusLabel={text.moreOne}
          />
        ) : (
          <button
            type="button"
            onClick={() => onInclude(false)}
            className="min-h-11 rounded-full bg-surface-muted px-4 text-sm font-semibold"
          >
            {text.leaveOut}
          </button>
        )}
      </div>
      {!readable && <Note tone="danger">{text.lineUnreadable}</Note>}
      {readable && !lineAgrees(line) && line.printedTotalPaise !== null && (
        <Note tone="warning">{text.billSays(formatMoney(line.printedTotalPaise))}</Note>
      )}
    </div>
  );
}

function Note({ tone, children }: { tone: "warning" | "danger"; children: ReactNode }) {
  return (
    <p
      className={cn(
        "mt-2 flex items-start gap-2 rounded-xl px-3 py-2 text-sm font-medium",
        tone === "danger" ? "bg-danger/10 text-danger" : "bg-warning/10 text-warning",
      )}
    >
      <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
      {children}
    </p>
  );
}

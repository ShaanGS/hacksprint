"use client";

import { Repeat2 } from "lucide-react";
import { useState } from "react";
import { Amount } from "@/components/ui/amount";
import { Art, toArtName } from "@/components/ui/art";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ListRow } from "@/components/ui/list-row";
import { Monogram } from "@/components/ui/monogram";
import { Sheet } from "@/components/ui/sheet";
import { formatMoney } from "@/lib/money";
import type { ProductUnit } from "@/lib/orders/quantity";
import type { RejectReason } from "@/lib/orders/state";
import type { OwnerOrder } from "@/lib/owner/types";

const reasons: { code: RejectReason; label: string }[] = [
  { code: "out_of_stock", label: "Items are out of stock" },
  { code: "shop_closed", label: "The shop is closed" },
  { code: "cannot_deliver", label: "Can't deliver right now" },
  { code: "other", label: "Something else" },
];

/** "2 ×" for packs and pieces, "0.5 kg" for loose goods. */
export function qtyLabel(qty: number, unit: ProductUnit): string {
  return unit === "kg" || unit === "litre" ? `${qty} ${unit}` : `${qty} ×`;
}

/** O1: the order in front of the owner, with everything needed to decide in one look. */
export function OrderCard({
  order,
  onApprove,
  onReject,
}: {
  order: OwnerOrder;
  onApprove: () => void;
  onReject: (reason: RejectReason) => void;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState<RejectReason>("out_of_stock");
  const payment = order.paymentMode === "credit" ? "On account" : "Paytm link";

  return (
    <article className="rounded-3xl bg-surface p-4 shadow-float ring-1 ring-border">
      <header className="flex items-center gap-3">
        <Monogram name={order.customer} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg leading-tight font-bold">{order.customer}</p>
          <p className="text-sm text-ink-muted">
            #{order.number} · {order.placedAt} · {payment}
          </p>
        </div>
        {order.newCustomer ? (
          <Badge tone="best">New</Badge>
        ) : (
          order.balancePaise > 0 && <Badge>Owes {formatMoney(order.balancePaise)}</Badge>
        )}
      </header>

      <ul className="mt-4 space-y-1">
        {order.lines.map((line) => (
          <li key={line.code} className="flex items-center gap-3">
            <Art name={toArtName(line.art)} size={48} />
            <span className="min-w-0 flex-1 truncate text-base">
              <span className="font-semibold tabular-nums">{qtyLabel(line.qty, line.unit)}</span>{" "}
              {line.name}
            </span>
            <Amount paise={line.lineTotalPaise} size="md" />
          </li>
        ))}
      </ul>

      {order.note && (
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-tint-sand px-3 py-2 text-sm">
          <Repeat2 aria-hidden className="mt-0.5 size-4 shrink-0" />
          {order.note}
        </p>
      )}

      <div className="mt-4 flex items-baseline justify-between border-t border-border pt-3">
        <span className="text-lg font-semibold">Total</span>
        <Amount paise={order.totalPaise} size="xl" />
      </div>

      <div className="mt-4 flex items-center gap-2">
        <Button variant="ghost" onClick={() => setRejecting(true)}>
          Reject
        </Button>
        <Button className="flex-1" onClick={onApprove}>
          Approve {formatMoney(order.totalPaise)}
        </Button>
      </div>

      <Sheet
        open={rejecting}
        onOpenChange={setRejecting}
        title="Why can't you take it?"
        description={`${order.customer} sees the reason in their language.`}
        footer={
          <Button
            variant="danger"
            wide
            onClick={() => {
              setRejecting(false);
              onReject(reason);
            }}
          >
            Reject order #{order.number}
          </Button>
        }
      >
        <div className="-mx-3 space-y-1">
          {reasons.map((option) => (
            <ListRow
              key={option.code}
              title={option.label}
              selected={reason === option.code}
              onClick={() => setReason(option.code)}
            />
          ))}
        </div>
      </Sheet>
    </article>
  );
}

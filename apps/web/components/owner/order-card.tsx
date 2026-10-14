"use client";

import { useState } from "react";
import { Amount } from "@/components/ui/amount";
import { Art, toArtName } from "@/components/ui/art";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ListRow } from "@/components/ui/list-row";
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

/** O1: one order waiting for the owner, with everything needed to decide in one look. */
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
    <Card className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-lg font-bold">{order.customer}</p>
          <p className="text-sm text-ink-muted">
            #{order.number} · {order.placedAt} · {payment}
          </p>
        </div>
        {order.newCustomer ? (
          <Badge>New customer</Badge>
        ) : (
          order.balancePaise > 0 && <Badge>Owes {formatMoney(order.balancePaise)}</Badge>
        )}
      </div>

      <ul className="space-y-2">
        {order.lines.map((line) => (
          <li key={line.code} className="flex items-center gap-3">
            <Art name={toArtName(line.art)} size={40} />
            <span className="min-w-0 flex-1 truncate text-base">
              {qtyLabel(line.qty, line.unit)} {line.name}
            </span>
            <Amount paise={line.lineTotalPaise} className="text-base" />
          </li>
        ))}
      </ul>
      {order.note && <p className="text-sm text-ink-muted">{order.note}</p>}

      <div className="flex items-baseline justify-between border-t border-border pt-3">
        <span className="text-lg font-medium">Total</span>
        <Amount paise={order.totalPaise} className="text-2xl font-bold" />
      </div>

      <div className="flex gap-3">
        <Button variant="soft" onClick={() => setRejecting(true)}>
          Reject
        </Button>
        <Button className="flex-1" onClick={onApprove}>
          Approve {formatMoney(order.totalPaise)}
        </Button>
      </div>

      <Sheet open={rejecting} onOpenChange={setRejecting} title="Why can't you take it?">
        <div className="space-y-1">
          {reasons.map((option) => (
            <ListRow
              key={option.code}
              title={option.label}
              selected={reason === option.code}
              onClick={() => setReason(option.code)}
            />
          ))}
        </div>
        <p className="mt-3 text-center text-sm text-ink-muted">
          {order.customer} sees this in their language.
        </p>
        <Button
          variant="danger"
          wide
          className="mt-4"
          onClick={() => {
            setRejecting(false);
            onReject(reason);
          }}
        >
          Reject order #{order.number}
        </Button>
      </Sheet>
    </Card>
  );
}

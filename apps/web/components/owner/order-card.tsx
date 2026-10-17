"use client";

import { Languages, Repeat2 } from "lucide-react";
import { useState } from "react";
import { useOwnerLanguage } from "@/components/owner/owner-language";
import { Amount } from "@/components/ui/amount";
import { Art, toArtName } from "@/components/ui/art";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HoldMic, type MicState } from "@/components/ui/hold-mic";
import { ListRow } from "@/components/ui/list-row";
import { Monogram } from "@/components/ui/monogram";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/cn";
import { langInfo } from "@/lib/i18n/languages";
import { formatMoney } from "@/lib/money";
import type { ProductUnit } from "@/lib/orders/quantity";
import type { RejectReason } from "@/lib/orders/state";
import type { PaymentMode } from "@/lib/orders/submit";
import type { OwnerOrder } from "@/lib/owner/types";

const reasonCodes: RejectReason[] = ["out_of_stock", "shop_closed", "cannot_deliver", "other"];

/** "2 ×" for packs and pieces, "0.5 kg" for loose goods. */
function qtyLabel(qty: number, unit: ProductUnit): string {
  return unit === "kg" || unit === "litre" ? `${qty} ${unit}` : `${qty} ×`;
}

/**
 * O1: the order in front of the owner, in the owner's language, with everything needed to decide
 * in one look. Say "seri" into the mic or tap Approve; Reject and Put on account sit underneath.
 */
export function OrderCard({
  order,
  mic,
  onHoldStart,
  onHoldEnd,
  onApprove,
  onReject,
}: {
  order: OwnerOrder;
  mic: MicState;
  onHoldStart: () => void;
  onHoldEnd: () => void;
  onApprove: (mode?: PaymentMode) => void;
  onReject: (reason: RejectReason) => void;
}) {
  const { lang: ownerLang, text } = useOwnerLanguage();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState<RejectReason>("out_of_stock");
  const onLink = order.paymentMode === "link";
  const micLabel =
    mic === "listening" ? text.listening : mic === "thinking" ? text.working : text.holdToSay;

  return (
    <article className="rounded-3xl bg-surface p-4 shadow-float ring-1 ring-border">
      <header className="flex items-center gap-3">
        <Monogram name={order.customer} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg leading-tight font-bold">{order.customer}</p>
          <p className="text-sm text-ink-muted">
            #{order.number} · {order.placedAt} · {onLink ? text.paytmLink : text.onAccount}
          </p>
        </div>
        {order.newCustomer ? (
          <Badge tone="best">{text.newCustomer}</Badge>
        ) : (
          order.balancePaise > 0 && <Badge>{text.owes(formatMoney(order.balancePaise))}</Badge>
        )}
      </header>

      {order.lang && order.lang !== ownerLang && (
        <p className="mt-3 flex items-center gap-2 rounded-xl bg-tint-sky px-3 py-2 text-sm font-medium">
          <Languages aria-hidden className="size-4 shrink-0" />
          {text.orderedIn[order.lang]}
          <span lang={order.lang} className="ml-auto text-ink-muted">
            {langInfo[order.lang].name}
          </span>
        </p>
      )}

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

      {order.outOfStock.length > 0 && (
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-tint-sand px-3 py-2 text-sm">
          <Repeat2 aria-hidden className="mt-0.5 size-4 shrink-0" />
          {text.outOfStockNote(order.outOfStock.join(", "))}
        </p>
      )}

      <div className="mt-4 flex items-baseline justify-between border-t border-border pt-3">
        <span className="text-lg font-semibold">{text.total}</span>
        <Amount paise={order.totalPaise} size="xl" />
      </div>

      <div className="mt-4 flex items-center gap-3">
        <HoldMic
          size="md"
          variant="soft"
          state={mic}
          label={micLabel}
          onHoldStart={onHoldStart}
          onHoldEnd={onHoldEnd}
        />
        <Button className="flex-1" disabled={mic !== "idle"} onClick={() => onApprove()}>
          {text.approve(formatMoney(order.totalPaise))}
        </Button>
      </div>
      <p aria-live="polite" className="mt-2 text-sm font-medium text-ink-muted">
        {micLabel}
      </p>
      <div className={cn("mt-3 grid gap-2", onLink ? "grid-cols-2" : "grid-cols-1")}>
        <Button variant="soft" disabled={mic !== "idle"} onClick={() => setRejecting(true)}>
          {text.reject}
        </Button>
        {onLink && (
          <Button variant="soft" disabled={mic !== "idle"} onClick={() => onApprove("credit")}>
            {text.putOnAccount}
          </Button>
        )}
      </div>

      <Sheet
        open={rejecting}
        onOpenChange={setRejecting}
        title={text.whyReject}
        description={text.theySeeReason(order.customer)}
        footer={
          <Button
            variant="danger"
            wide
            onClick={() => {
              setRejecting(false);
              onReject(reason);
            }}
          >
            {text.rejectOrder(order.number)}
          </Button>
        }
      >
        <div className="-mx-3 space-y-1">
          {reasonCodes.map((code) => (
            <ListRow
              key={code}
              title={text.reasons[code]}
              selected={reason === code}
              onClick={() => setReason(code)}
            />
          ))}
        </div>
      </Sheet>
    </article>
  );
}

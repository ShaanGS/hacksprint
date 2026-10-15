"use client";

import { Volume2 } from "lucide-react";
import { useState } from "react";
import { Amount } from "@/components/ui/amount";
import { Art, toArtName } from "@/components/ui/art";
import { Button } from "@/components/ui/button";
import { QtyStepper } from "@/components/ui/qty-stepper";
import { Sheet } from "@/components/ui/sheet";
import { Ticker } from "@/components/ui/ticker";
import { Tile } from "@/components/ui/tile";
import type { Lang } from "@/lib/i18n/languages";
import { quantityPhrase } from "@/lib/i18n/speech";
import { textFor } from "@/lib/i18n/text";
import { formatMoney } from "@/lib/money";
import type { Cart, CartLine } from "@/lib/orders/cart";
import type { PaymentMode } from "@/lib/orders/submit";

/**
 * The cart and the order review in one sheet. Changing a line goes straight to the cart, with
 * no AI in between. Lines and the total come from the server; the footer keeps Send in reach.
 */
export function CartSheet({
  open,
  onOpenChange,
  lang,
  shopName,
  cart,
  readBack,
  onQuantity,
  onSend,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lang: Lang;
  shopName: string;
  cart: Cart;
  /** The spoken read-back, shown while the order is being reviewed. */
  readBack: string | null;
  onQuantity: (code: string, qty: number) => void;
  onSend: (mode: PaymentMode) => Promise<void>;
}) {
  const t = textFor(lang);
  const [mode, setMode] = useState<PaymentMode>("link");
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);
  const empty = cart.lines.length === 0;

  async function send() {
    setSending(true);
    setFailed(false);
    try {
      await onSend(mode);
    } catch {
      setFailed(true);
    } finally {
      setSending(false);
    }
  }

  const footer = empty ? undefined : (
    <div lang={lang}>
      <div className="flex items-baseline justify-between">
        <span className="text-lg font-semibold">{t.total}</span>
        <Ticker paise={cart.totalPaise} className="text-2xl font-extrabold tracking-tight" />
      </div>
      {failed && (
        <p role="alert" className="mt-1 text-sm font-medium text-danger">
          {t.tryAgain}
        </p>
      )}
      <Button wide className="mt-3" disabled={sending} onClick={send}>
        {sending ? t.sending : t.sendOrder(shopName)}
      </Button>
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={t.review} footer={footer}>
      <div lang={lang}>
        {empty ? (
          <div className="flex flex-col items-center py-8 text-center">
            <Art name="bag" size={120} />
            <p className="mt-3 text-lg text-ink-muted">{t.cartEmpty}</p>
          </div>
        ) : (
          <>
            {readBack && (
              <div className="mb-4 flex gap-3 rounded-2xl bg-tint-sky p-4">
                <Volume2 aria-hidden className="mt-0.5 size-5 shrink-0" />
                <p className="text-base font-medium">{readBack}</p>
              </div>
            )}
            <ul className="divide-y divide-border">
              {cart.lines.map((line) => (
                <Line key={line.code} line={line} lang={lang} onQuantity={onQuantity} />
              ))}
            </ul>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Tile
                art="phone-pay"
                artSize={64}
                selected={mode === "link"}
                onClick={() => setMode("link")}
                className="min-h-32"
              >
                <p className="text-base leading-snug font-semibold">{t.payByLink}</p>
              </Tile>
              <Tile
                art="khata"
                artSize={64}
                selected={mode === "credit"}
                onClick={() => setMode("credit")}
                className="min-h-32"
              >
                <p className="text-base leading-snug font-semibold">{t.onAccount}</p>
              </Tile>
            </div>
          </>
        )}
      </div>
    </Sheet>
  );
}

function Line({
  line,
  lang,
  onQuantity,
}: {
  line: CartLine;
  lang: Lang;
  onQuantity: (code: string, qty: number) => void;
}) {
  const t = textFor(lang);
  // A pack at a time, or a quarter kilo for loose goods.
  const step = line.unit === "kg" || line.unit === "litre" ? 0.25 : 1;
  const removes = line.qty <= step;
  return (
    <li className="flex items-center gap-3 py-3">
      <Art name={toArtName(line.art)} size={56} />
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-base leading-snug font-semibold">{line.name}</p>
        <p className="truncate text-sm text-ink-muted">
          {quantityPhrase(line.qty, line.unit, lang)} × {formatMoney(line.unitPricePaise)}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <Amount paise={line.lineTotalPaise} size="md" />
        <QtyStepper
          value={String(line.qty)}
          removes={removes}
          onMinus={() => onQuantity(line.code, removes ? 0 : line.qty - step)}
          onPlus={() => onQuantity(line.code, line.qty + step)}
          minusLabel={removes ? t.removeItem(line.name) : t.oneLess(line.name)}
          plusLabel={t.oneMore(line.name)}
        />
      </div>
    </li>
  );
}

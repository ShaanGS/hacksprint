"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Amount } from "@/components/ui/amount";
import { Art, toArtName } from "@/components/ui/art";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ListRow } from "@/components/ui/list-row";
import { Sheet } from "@/components/ui/sheet";
import { Ticker } from "@/components/ui/ticker";
import type { Lang } from "@/lib/i18n/languages";
import { quantityPhrase } from "@/lib/i18n/speech";
import { textFor } from "@/lib/i18n/text";
import { formatMoney } from "@/lib/money";
import type { Cart, CartLine } from "@/lib/orders/cart";
import type { PaymentMode } from "@/lib/orders/submit";

/**
 * The cart and the order review in one sheet. Changing a line goes straight to the cart, with
 * no AI in between. Lines and the total come from the server.
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={t.review}>
      <div lang={lang}>
        {cart.lines.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-center">
            <Art name="bag" size={96} />
            <p className="mt-3 text-lg text-ink-muted">{t.cartEmpty}</p>
          </div>
        ) : (
          <>
            <ul>
              {cart.lines.map((line) => (
                <li key={line.code}>
                  <ListRow
                    art={<Art name={toArtName(line.art)} />}
                    title={line.name}
                    meta={`${quantityPhrase(line.qty, line.unit, lang)} × ${formatMoney(line.unitPricePaise)}`}
                    trailing={<Amount paise={line.lineTotalPaise} />}
                  />
                  <Stepper line={line} onQuantity={onQuantity} />
                </li>
              ))}
            </ul>
            {readBack && (
              <Card className="mt-4">
                <p className="text-lg">{readBack}</p>
              </Card>
            )}
            <Card className="mt-3 flex items-baseline justify-between">
              <span className="text-lg font-medium">{t.total}</span>
              <Ticker paise={cart.totalPaise} className="text-2xl font-bold" />
            </Card>
            <div className="mt-4 space-y-1">
              <ListRow
                art={<Art name="coins" size={48} />}
                title={t.payByLink}
                selected={mode === "link"}
                onClick={() => setMode("link")}
              />
              <ListRow
                art={<Art name="khata" size={48} />}
                title={t.onAccount}
                selected={mode === "credit"}
                onClick={() => setMode("credit")}
              />
            </div>
            {failed && (
              <p role="alert" className="mt-3 text-center text-sm font-medium text-danger">
                {t.tryAgain}
              </p>
            )}
            <Button wide className="mt-4" disabled={sending} onClick={send}>
              {sending ? t.sending : t.sendOrder(shopName)}
            </Button>
          </>
        )}
      </div>
    </Sheet>
  );
}

const stepButton =
  "grid size-11 place-items-center rounded-full bg-surface-muted text-ink active:scale-95";

/** Minus and plus for one line: a pack at a time, or a quarter kilo for loose goods. */
function Stepper({
  line,
  onQuantity,
}: {
  line: CartLine;
  onQuantity: (code: string, qty: number) => void;
}) {
  const step = line.unit === "kg" || line.unit === "litre" ? 0.25 : 1;
  const last = line.qty <= step;
  return (
    <div className="flex items-center justify-end gap-3 px-3 pb-3">
      <button
        type="button"
        aria-label={last ? `Remove ${line.name}` : `One less ${line.name}`}
        className={stepButton}
        onClick={() => onQuantity(line.code, last ? 0 : line.qty - step)}
      >
        {last ? (
          <Trash2 aria-hidden className="size-5" />
        ) : (
          <Minus aria-hidden className="size-5" />
        )}
      </button>
      <span className="min-w-8 text-center text-lg font-medium tabular-nums">{line.qty}</span>
      <button
        type="button"
        aria-label={`One more ${line.name}`}
        className={stepButton}
        onClick={() => onQuantity(line.code, line.qty + step)}
      >
        <Plus aria-hidden className="size-5" />
      </button>
    </div>
  );
}

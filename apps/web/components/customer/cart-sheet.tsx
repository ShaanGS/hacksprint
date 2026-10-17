"use client";

import { ReceiptIndianRupee, Volume2 } from "lucide-react";
import { useState } from "react";
import { Amount } from "@/components/ui/amount";
import { Art, toArtName } from "@/components/ui/art";
import { Button } from "@/components/ui/button";
import { QtyStepper } from "@/components/ui/qty-stepper";
import { Sheet } from "@/components/ui/sheet";
import { Ticker } from "@/components/ui/ticker";
import { Tile } from "@/components/ui/tile";
import { langInfo, type Lang } from "@/lib/i18n/languages";
import { quantityPhrase } from "@/lib/i18n/speech";
import { textFor } from "@/lib/i18n/text";
import { formatMoney } from "@/lib/money";
import type { Cart, CartLine } from "@/lib/orders/cart";
import type { PaymentMode } from "@/lib/orders/submit";
import type { PriceSource } from "@/lib/sources/types";

/**
 * The cart and the order review in one sheet. Changing a line goes straight to the cart, with
 * no AI in between. Lines and the total come from the server; the footer keeps Send in reach.
 * Tapping the total shows the bill behind every price (spec E3).
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
  onSources,
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
  onSources: () => Promise<PriceSource[]>;
}) {
  const t = textFor(lang);
  const [mode, setMode] = useState<PaymentMode>("link");
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);
  const [sources, setSources] = useState<PriceSource[] | null>(null);
  const [showSources, setShowSources] = useState(false);
  const empty = cart.lines.length === 0;

  function toggleSources() {
    if (showSources) {
      setShowSources(false);
      return;
    }
    setShowSources(true);
    setSources(null);
    onSources().then(setSources, () => setShowSources(false));
  }

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
      <button
        type="button"
        aria-expanded={showSources}
        onClick={toggleSources}
        className="flex min-h-11 w-full items-baseline justify-between text-left"
      >
        <span className="flex items-center gap-1.5 text-lg font-semibold">
          {t.total}
          <ReceiptIndianRupee aria-label={t.pricesFrom} className="size-4 text-ink-muted" />
        </span>
        <Ticker paise={cart.totalPaise} className="text-2xl font-extrabold tracking-tight" />
      </button>
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
        {showSources && !empty ? (
          <PriceSources lang={lang} sources={sources} />
        ) : empty ? (
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
                size="sm"
              >
                <p className="text-base leading-snug font-semibold">{t.payByLink}</p>
              </Tile>
              <Tile
                art="khata"
                artSize={64}
                selected={mode === "credit"}
                onClick={() => setMode("credit")}
                size="sm"
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

/** Each price and the bill that printed it: the MRP, the distributor and the bill number. */
function PriceSources({ lang, sources }: { lang: Lang; sources: PriceSource[] | null }) {
  const t = textFor(lang);
  if (!sources) {
    return (
      <div className="grid h-40 place-items-center">
        <Art name="bill" size={96} />
      </div>
    );
  }
  const day = (iso: string) =>
    new Date(iso).toLocaleDateString(langInfo[lang].sarvamCode, { day: "numeric", month: "short" });
  return (
    <>
      <div className="mb-3 flex gap-3 rounded-2xl bg-tint-mint p-4">
        <ReceiptIndianRupee aria-hidden className="mt-0.5 size-5 shrink-0" />
        <div>
          <p className="text-base font-bold">{t.pricesFrom}</p>
          <p className="mt-0.5 text-sm">{t.pricesNote}</p>
        </div>
      </div>
      <ul className="divide-y divide-border">
        {sources.map((source) => (
          <li key={source.productId} className="flex items-center gap-3 py-3">
            <Art name={toArtName(source.art)} size={48} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-semibold">{source.name}</p>
              <p className="text-sm text-ink-muted">
                {source.bill && source.bill.mrpPaise !== null
                  ? t.priceOnBill(
                      formatMoney(source.bill.mrpPaise),
                      [source.bill.distributor, source.bill.billNumber, day(source.bill.billedOn)]
                        .filter(Boolean)
                        .join(" · "),
                    )
                  : t.priceSetByShop}
              </p>
            </div>
            <Amount paise={source.pricePaise} size="md" />
          </li>
        ))}
      </ul>
    </>
  );
}

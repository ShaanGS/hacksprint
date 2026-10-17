"use client";

import { Check, ChevronRight } from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useState } from "react";
import { BillScan } from "@/components/owner/bill-scan";
import { useLive } from "@/components/owner/live";
import { Margins } from "@/components/owner/margins";
import { useOwnerLanguage } from "@/components/owner/owner-language";
import { Failed, Loading } from "@/components/owner/screen-state";
import { Section } from "@/components/owner/section";
import { PriceSheet } from "@/components/owner/source-sheet";
import { SourceBadge } from "@/components/owner/source-badge";
import { TabHeader } from "@/components/owner/tab-header";
import { useDates } from "@/components/owner/use-dates";
import { Amount } from "@/components/ui/amount";
import { Art, toArtName } from "@/components/ui/art";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ListRow } from "@/components/ui/list-row";
import { Ticker } from "@/components/ui/ticker";
import { snappy } from "@/lib/motion";
import type { ProductUnit } from "@/lib/orders/quantity";
import { ownerApi, type ShelfRow } from "@/lib/owner/api";

/**
 * B2, B3, C1, C2: today's bill photo, the festival order, money stuck in slow items, the items
 * to count by voice, and every item's estimate. Tapping an item shows the bill behind its cost.
 * Plus distributor low-stock reorder section wired to /api/reorder.
 */
export function StockTab({
  shopName = "Lakshmi Stores",
  onBank,
}: {
  shopName?: string;
  onBank: () => void;
}) {
  const { lang, text } = useOwnerLanguage();
  const dates = useDates();
  const stock = useLive(ownerApi.stock, ["stock"]);
  const stuck = useLive(ownerApi.stuck, ["stock"]);
  const [priced, setPriced] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [failed, setFailed] = useState(false);
  const close = useCallback(() => setPriced(null), []);

  if (!stock.data) {
    return stock.failed ? <Failed art="crate" onRetry={stock.reload} /> : <Loading art="crate" />;
  }

  const { products, festival_order: order } = stock.data;
  const left = (row: ShelfRow) =>
    text.about(text.left(Math.round(row.estimate_qty), row.unit as ProductUnit));
  const lasts = (row: ShelfRow) =>
    row.days_left === "not_moving"
      ? text.notMoving
      : row.days_left === null
        ? text.notCounted
        : text.daysLeft(Math.round(row.days_left));
  const counted = (row: ShelfRow) =>
    row.counted_at ? text.countedOn(dates.day(row.counted_at)) : text.notCounted;
  const toCount = products.filter((row) => row.count_asked);

  const distributorName = "Sri Balaji Agencies";
  const lowItems = products.filter((row) => row.tags.includes("low"));

  const reorderLines =
    lowItems.length > 0
      ? lowItems.map((line) => ({
          name: line.name,
          qty: Math.max(1, Math.round(line.estimate_qty <= 0 ? 5 : line.estimate_qty * 2)),
          unit: line.unit,
          art: line.art,
        }))
      : products.slice(0, 3).map((line) => ({
          name: line.name,
          qty: 5,
          unit: line.unit,
          art: line.art,
        }));

  async function sendReorder() {
    setSending(true);
    setFailed(false);
    const response = await fetch("/api/reorder", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        shopName,
        distributorName,
        lines: reorderLines.map((line) => ({ name: line.name, qty: line.qty, unit: line.unit })),
      }),
    }).catch(() => null);
    setSending(false);
    if (response?.ok) {
      setSent(true);
      setTimeout(() => setSent(false), 5000);
    } else {
      setFailed(true);
    }
  }

  return (
    <main className="px-4 pt-2 pb-44">
      <TabHeader title={text.stockTitle} />

      <section className="relative mt-4 overflow-hidden rounded-3xl bg-tint-sand p-5">
        <Art name="crate" size={120} eager className="absolute -top-1 -right-3" />
        <p className="text-sm font-semibold text-ink-muted">{text.shelfHero}</p>
        <Ticker
          paise={stock.data.on_shelf_paise}
          className="mt-1 block text-hero font-extrabold tracking-tight"
        />
        <div className="mt-2">
          <SourceBadge label="estimate" />
        </div>
        <p className="mt-2 max-w-60 text-sm text-ink-muted">{text.estimateNote}</p>
        {stock.data.cost_unknown.length > 0 && (
          <p className="mt-1 text-sm font-medium">
            {text.costUnknown(stock.data.cost_unknown.length)}
          </p>
        )}
      </section>

      <div className="mt-4">
        <BillScan
          products={products.map((row) => ({
            id: row.product_id,
            name: row.name,
            art: row.art,
            packSize: row.pack_size,
          }))}
          onAdded={stock.reload}
        />
      </div>

      {order && (
        <section className="mt-4 rounded-2xl bg-surface-muted p-4">
          <div className="flex items-start gap-3">
            <Art name="bag" size={56} />
            <div className="min-w-0 flex-1">
              <p className="text-lg font-bold">{text.festivalTitle(order.festival)}</p>
              <p className="text-sm text-ink-muted">
                {text.festivalLine(order.distributor, order.lines)}
              </p>
            </div>
            <Amount paise={order.total_paise} size="lg" />
          </div>
          <button
            type="button"
            onClick={onBank}
            className="mt-3 flex min-h-11 w-full items-center justify-between rounded-xl bg-surface px-4 text-base font-semibold"
          >
            {text.festivalLoan}
            <ChevronRight aria-hidden className="size-5" />
          </button>
        </section>
      )}

      {/* Distributor Reorder section */}
      <section className="relative mt-6 overflow-hidden rounded-3xl bg-surface-muted p-4">
        <Art name="crate" size={96} className="absolute -top-2 -right-2" />
        <h2 className="pr-24 text-xl leading-tight font-extrabold tracking-tight">
          {lang === "ta" ? `${distributorName} இடம் ஆர்டர் செய்க` : `Order from ${distributorName}`}
        </h2>
        <p className="mt-1 pr-24 text-sm text-ink-muted">
          {lang === "ta"
            ? "குறைந்த இருப்பு அளவுக்கு ஏற்ப மறுஆர்டர்"
            : "Back up to twice the low-stock level"}
        </p>
        {reorderLines.length === 0 ? (
          <p className="mt-4 text-base font-medium">
            {lang === "ta" ? "எந்தப் பொருளும் குறைவாக இல்லை." : "Nothing is running low."}
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {reorderLines.map((line) => (
              <li key={line.name} className="flex items-center gap-3">
                <Art name={toArtName(line.art, line.name)} size={44} />
                <span className="min-w-0 flex-1 truncate text-base font-medium">{line.name}</span>
                <span className="text-base font-bold tabular-nums">
                  {line.unit === "kg" || line.unit === "litre"
                    ? `${line.qty} ${line.unit}`
                    : `${line.qty} ×`}
                </span>
              </li>
            ))}
          </ul>
        )}
        {reorderLines.length > 0 && (
          <div className="mt-4">
            {sent ? (
              <motion.p
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                transition={snappy}
                className="flex min-h-14 items-center justify-center gap-2 rounded-xl bg-success/15 text-base font-semibold text-success"
              >
                <Check aria-hidden className="size-5" strokeWidth={3} />
                {lang === "ta"
                  ? `${distributorName} க்கு அனுப்பப்பட்டது`
                  : `Sent to ${distributorName}`}
              </motion.p>
            ) : (
              <>
                <Button wide disabled={sending} onClick={sendReorder}>
                  {sending
                    ? lang === "ta"
                      ? "அனுப்புகிறது…"
                      : "Sending…"
                    : lang === "ta"
                      ? `${distributorName} க்கு அனுப்புக`
                      : `Send to ${distributorName}`}
                </Button>
                {failed && (
                  <p className="mt-2 text-sm font-medium text-danger">
                    {lang === "ta"
                      ? `${distributorName} ஐ தொடர்பு கொள்ள முடியவில்லை. மீண்டும் முயற்சிக்கவும்.`
                      : `Couldn't reach ${distributorName}. Try again.`}
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </section>

      {stuck.data && stuck.data.products.length > 0 && (
        <Section title={text.stuckTitle} total={stuck.data.stuck_paise} note={text.dontReorder}>
          {stuck.data.products.map((row) => (
            <li key={row.product_id}>
              <ListRow
                art={<Art name={toArtName(row.art, row.name)} size={56} />}
                title={row.name}
                meta={`${left(row)} · ${lasts(row)}`}
                trailing={row.value_paise !== null && <Amount paise={row.value_paise} size="md" />}
                onClick={() => setPriced(row.product_id)}
              />
            </li>
          ))}
        </Section>
      )}

      {toCount.length > 0 && (
        <Section title={text.countTitle} note={text.countHint}>
          {toCount.map((row) => (
            <li key={row.product_id}>
              <ListRow
                art={<Art name={toArtName(row.art, row.name)} size={44} />}
                title={row.name}
                meta={counted(row)}
              />
            </li>
          ))}
        </Section>
      )}

      <Section title={text.everyItem}>
        {products.map((row) => (
          <li key={row.product_id}>
            <ListRow
              art={<Art name={toArtName(row.art, row.name)} size={56} />}
              tag={
                row.tags.includes("low") ? (
                  <Badge tone="warning">{text.lowBadge}</Badge>
                ) : row.tags.includes("slow") ? (
                  <Badge>{text.slowBadge}</Badge>
                ) : undefined
              }
              title={row.name}
              meta={`${left(row)} · ${lasts(row)}`}
              note={counted(row)}
              trailing={row.value_paise !== null && <Amount paise={row.value_paise} size="md" />}
              onClick={() => setPriced(row.product_id)}
            />
          </li>
        ))}
      </Section>

      <div className="mt-6">
        <Margins />
      </div>

      <PriceSheet productId={priced} onClose={close} />
    </main>
  );
}

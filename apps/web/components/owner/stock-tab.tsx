"use client";

import { Bot, ChevronRight, ShoppingBag } from "lucide-react";
import { useCallback, useState } from "react";
import { BillScan } from "@/components/owner/bill-scan";
import { useLive } from "@/components/owner/live";
import { Margins } from "@/components/owner/margins";
import { useOwnerLanguage } from "@/components/owner/owner-language";
import { useOwnerScreen } from "@/components/owner/owner-screen";
import { Failed, Loading } from "@/components/owner/screen-state";
import { Section } from "@/components/owner/section";
import { PriceSheet } from "@/components/owner/source-sheet";
import { SourceBadge } from "@/components/owner/source-badge";
import { TabHeader } from "@/components/owner/tab-header";
import { useDates } from "@/components/owner/use-dates";
import { Amount } from "@/components/ui/amount";
import { IconCircle } from "@/components/ui/icon-circle";
import { ProductImage } from "@/components/ui/product-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ListRow } from "@/components/ui/list-row";
import { Ticker } from "@/components/ui/ticker";
import { agentWordsFor } from "@/lib/i18n/agents";
import type { ProductUnit } from "@/lib/orders/quantity";
import { ownerApi, type ShelfRow } from "@/lib/owner/api";

/**
 * B2, B3, C1, C2: today's bill photo, the festival order, money stuck in slow items, the items
 * to count by voice, and every item's estimate. Tapping an item shows the bill behind its cost.
 */
export function StockTab({ onBank }: { onBank: () => void }) {
  const { lang, text } = useOwnerLanguage();
  const { openAgent } = useOwnerScreen();
  const dates = useDates();
  const stock = useLive(ownerApi.stock, ["stock"]);
  const stuck = useLive(ownerApi.stuck, ["stock"]);
  const [priced, setPriced] = useState<string | null>(null);
  const close = useCallback(() => setPriced(null), []);

  if (!stock.data) {
    return stock.failed ? <Failed onRetry={stock.reload} /> : <Loading />;
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

  const badge = (row: ShelfRow) =>
    row.tags.includes("low") ? (
      <Badge tone="warning">{text.lowBadge}</Badge>
    ) : row.tags.includes("slow") ? (
      <Badge>{text.slowBadge}</Badge>
    ) : null;

  return (
    <main className="px-4 pt-2 pb-44">
      <TabHeader title={text.stockTitle} />

      <section className="mt-5">
        <SourceBadge label="estimate" />
        <Ticker
          paise={stock.data.on_shelf_paise}
          className="mt-2 block text-hero font-extrabold tracking-tight"
        />
        <p className="mt-1 text-sm text-ink-muted">{text.shelfHero}</p>
        {stock.data.cost_unknown.length > 0 && (
          <p className="mt-1 text-sm font-medium">
            {text.costUnknown(stock.data.cost_unknown.length)}
          </p>
        )}
      </section>

      <Button variant="lime" wide className="mt-5" onClick={() => openAgent("reorder")}>
        <Bot aria-hidden className="size-5" />
        {agentWordsFor(lang).letAgentReorder}
      </Button>

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
        <section className="mt-4 rounded-3xl bg-surface p-4 shadow-card">
          <div className="flex items-start gap-3">
            <IconCircle icon={ShoppingBag} tone="sand" size="lg" />
            <div className="min-w-0 flex-1">
              <p className="text-lg leading-snug font-bold">{text.festivalTitle(order.festival)}</p>
              <p className="text-sm text-ink-muted">
                {text.festivalLine(order.distributor, order.lines)}
              </p>
            </div>
            <Amount paise={order.total_paise} size="lg" />
          </div>
          <button
            type="button"
            onClick={onBank}
            className="mt-3 flex min-h-12 w-full items-center justify-between rounded-full bg-surface-muted px-5 text-base font-semibold transition-transform active:scale-98"
          >
            {text.festivalLoan}
            <ChevronRight aria-hidden className="size-5" />
          </button>
        </section>
      )}

      {toCount.length > 0 && (
        <section className="mt-7">
          <h2 className="px-1 text-lg leading-snug font-bold">{text.countTitle}</h2>
          <p className="mt-1 px-1 text-sm text-ink-muted">{text.countHint}</p>
          <ul className="-mx-4 mt-3 flex gap-3 overflow-x-auto px-4 pb-2">
            {toCount.map((row) => (
              <li
                key={row.product_id}
                className="w-32 shrink-0 rounded-3xl bg-surface p-3 shadow-card"
              >
                <ProductImage name={row.name} size="fill" />
                <p className="mt-2 line-clamp-2 text-sm leading-snug font-semibold">{row.name}</p>
                <p className="mt-0.5 text-xs text-ink-muted">{counted(row)}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {stuck.data && stuck.data.products.length > 0 && (
        <Section title={text.stuckTitle} total={stuck.data.stuck_paise} note={text.dontReorder}>
          {stuck.data.products.map((row) => (
            <li key={row.product_id}>
              <ListRow
                art={<ProductImage name={row.name} size="sm" />}
                title={row.name}
                meta={`${left(row)} · ${lasts(row)}`}
                trailing={row.value_paise !== null && <Amount paise={row.value_paise} size="md" />}
                onClick={() => setPriced(row.product_id)}
              />
            </li>
          ))}
        </Section>
      )}

      <section className="mt-7">
        <h2 className="px-1 text-lg leading-snug font-bold">{text.everyItem}</h2>
        <ul className="mt-3 grid grid-cols-2 gap-3">
          {products.map((row) => (
            <li key={row.product_id}>
              <button
                type="button"
                onClick={() => setPriced(row.product_id)}
                className="flex h-full w-full flex-col rounded-3xl bg-surface p-3 text-left shadow-card transition-transform active:scale-98"
              >
                <span className="relative block">
                  <ProductImage name={row.name} size="fill" />
                  {badge(row) && <span className="absolute top-2 left-2">{badge(row)}</span>}
                </span>
                <span className="mt-2 line-clamp-2 text-sm leading-snug font-semibold">
                  {row.name}
                </span>
                <span className="mt-0.5 block text-xs text-ink-muted">{left(row)}</span>
                <span className="block text-xs text-ink-muted">{lasts(row)}</span>
                {row.value_paise !== null && (
                  <span className="mt-auto pt-2">
                    <Amount paise={row.value_paise} size="md" />
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-6">
        <Margins />
      </div>

      <PriceSheet productId={priced} onClose={close} />
    </main>
  );
}

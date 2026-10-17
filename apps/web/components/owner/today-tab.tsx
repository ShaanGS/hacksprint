"use client";

import { Check } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { qtyLabel } from "@/components/owner/order-card";
import { Art, toArtName } from "@/components/ui/art";
import { RepaymentPlanner } from "@/components/owner/repayment-planner";
import { SchemesSection } from "@/components/owner/schemes-section";
import { Button } from "@/components/ui/button";
import { FeatureCard } from "@/components/ui/feature-card";
import { Tile } from "@/components/ui/tile";
import { Ticker } from "@/components/ui/ticker";
import type { ArtName } from "@/components/ui/art";
import { cn } from "@/lib/cn";
import { snappy } from "@/lib/motion";
import type { DaySummary, ReorderLine } from "@/lib/owner/types";

/** O5: how the day went, told as one sentence, the numbers behind it, and tomorrow's restock. */
export function TodayTab({
  shopName,
  distributorName,
  summary,
  report,
  reorder,
}: {
  shopName: string;
  distributorName: string;
  summary: DaySummary;
  /** The day in a sentence, built by code from the numbers. */
  report: string;
  reorder: ReorderLine[];
}) {
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function sendReorder() {
    setSending(true);
    setFailed(false);
    const response = await fetch("/api/reorder", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        shopName,
        distributorName,
        lines: reorder.map((line) => ({ name: line.name, qty: line.qty, unit: line.unit })),
      }),
    }).catch(() => null);
    setSending(false);
    if (response?.ok) setSent(true);
    else setFailed(true);
  }
  const tiles: { art: ArtName; label: string; paise?: number; count?: number; good?: boolean }[] = [
    { art: "bag", label: "Orders", count: summary.orders },
    { art: "savings", label: "Collected", paise: summary.collectedPaise, good: true },
    { art: "khata", label: "On account today", paise: summary.creditPaise },
    { art: "coins", label: "Owed in total", paise: summary.owedPaise },
  ];
  return (
    <main className="px-4 pt-6 pb-32">
      <h1 className="text-title font-extrabold tracking-tight">Today</h1>
      <FeatureCard banner="night" title="Tonight's report" text={report} className="mt-4" />

      <div className="mt-4 grid grid-cols-2 gap-3">
        {tiles.map((tile) => (
          <Tile key={tile.label} art={tile.art} artSize={72} size="sm">
            {tile.paise === undefined ? (
              <p className="text-2xl font-extrabold tracking-tight tabular-nums">{tile.count}</p>
            ) : (
              <Ticker
                paise={tile.paise}
                className={cn(
                  "block text-2xl font-extrabold tracking-tight",
                  tile.good && "text-success",
                )}
              />
            )}
            <p className="mt-0.5 text-sm font-medium text-ink-muted">{tile.label}</p>
          </Tile>
        ))}
      </div>

      <section className="relative mt-6 overflow-hidden rounded-3xl bg-surface-muted p-4">
        <Art name="crate" size={96} className="absolute -top-2 -right-2" />
        <h2 className="pr-24 text-xl leading-tight font-extrabold tracking-tight">
          Order from {distributorName}
        </h2>
        <p className="mt-1 pr-24 text-sm text-ink-muted">Back up to twice the low-stock level</p>
        {reorder.length === 0 ? (
          <p className="mt-4 text-base font-medium">Nothing is running low.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {reorder.map((line) => (
              <li key={line.code} className="flex items-center gap-3">
                <Art name={toArtName(line.art)} size={44} />
                <span className="min-w-0 flex-1 truncate text-base font-medium">{line.name}</span>
                <span className="text-base font-bold tabular-nums">
                  {qtyLabel(line.qty, line.unit)}
                </span>
              </li>
            ))}
          </ul>
        )}
        {reorder.length > 0 && (
          <div className="mt-4">
            {sent ? (
              <motion.p
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                transition={snappy}
                className="flex min-h-14 items-center justify-center gap-2 rounded-xl bg-success/15 text-base font-semibold text-success"
              >
                <Check aria-hidden className="size-5" strokeWidth={3} />
                Sent to {distributorName}
              </motion.p>
            ) : (
              <>
                <Button wide disabled={sending} onClick={sendReorder}>
                  {sending ? "Sending…" : `Send to ${distributorName}`}
                </Button>
                {failed && (
                  <p className="mt-2 text-sm font-medium text-danger">
                    Couldn&apos;t reach {distributorName}. Try again.
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </section>

      <RepaymentPlanner summary={summary} />

      <SchemesSection shopName={shopName} summary={summary} />
    </main>
  );
}

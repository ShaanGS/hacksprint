"use client";

import { useState } from "react";
import { qtyLabel } from "@/components/owner/order-card";
import { Art, toArtName } from "@/components/ui/art";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/money";
import type { DaySummary, ReorderLine } from "@/lib/owner/types";

/** O5: how the day went, and the restock order for the distributor. */
export function TodayTab({
  shopName,
  distributorName,
  summary,
  reorder,
}: {
  shopName: string;
  distributorName: string;
  summary: DaySummary;
  reorder: ReorderLine[];
}) {
  const [sent, setSent] = useState(false);
  const tiles = [
    { label: "Orders", value: String(summary.orders), good: false },
    { label: "Collected", value: formatMoney(summary.collectedPaise), good: true },
    { label: "On credit today", value: formatMoney(summary.creditPaise), good: false },
    { label: "Owed in total", value: formatMoney(summary.owedPaise), good: false },
  ];
  return (
    <main className="px-4 pt-8 pb-6">
      <h1 className="text-title font-bold">Today</h1>
      <p className="mt-1 text-base text-ink-muted">{shopName}</p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {tiles.map((tile) => (
          <Card key={tile.label}>
            <p className="text-sm text-ink-muted">{tile.label}</p>
            <p className={cn("mt-1 text-2xl font-bold tabular-nums", tile.good && "text-success")}>
              {tile.value}
            </p>
          </Card>
        ))}
      </div>

      <h2 className="mt-8 text-xl font-bold">Order from {distributorName}</h2>
      {reorder.length === 0 ? (
        <p className="mt-2 text-base text-ink-muted">Nothing is running low.</p>
      ) : (
        <>
          <ul className="mt-3 space-y-2">
            {reorder.map((line) => (
              <li key={line.code} className="flex min-h-14 items-center gap-3">
                <Art name={toArtName(line.art)} size={48} />
                <span className="flex-1 text-lg">{line.name}</span>
                <span className="text-lg font-medium tabular-nums">
                  {qtyLabel(line.qty, line.unit)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4">
            {sent ? (
              <Badge tone="success">Sent to {distributorName}</Badge>
            ) : (
              <Button wide onClick={() => setSent(true)}>
                Send to {distributorName}
              </Button>
            )}
          </div>
        </>
      )}
    </main>
  );
}

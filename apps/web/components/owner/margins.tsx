"use client";

import { ChevronRight } from "lucide-react";
import { useState } from "react";
import { useOwnerLanguage } from "@/components/owner/owner-language";
import { Art, toArtName } from "@/components/ui/art";
import { Sheet } from "@/components/ui/sheet";
import { formatMoney } from "@/lib/money";
import type { Margin } from "@/lib/margins";
import { ownerApi } from "@/lib/owner/api";

/**
 * C2, C3: what each item earns, from its latest bill, and where it is cheaper. A card on the
 * Stock tab opens the list; items another distributor sells for less come first.
 */
export function Margins() {
  const { text } = useOwnerLanguage();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Margin[] | null>(null);

  function show() {
    setOpen(true);
    ownerApi.margins().then(setRows, () => setOpen(false));
  }

  return (
    <>
      <button
        type="button"
        onClick={show}
        className="flex w-full items-center gap-3 rounded-2xl bg-surface-muted p-3 text-left transition-transform active:scale-98"
      >
        <Art name="coins" size={56} />
        <span className="min-w-0 flex-1 text-lg font-bold">{text.marginsTitle}</span>
        <ChevronRight aria-hidden className="size-5 shrink-0" />
      </button>
      <Sheet
        open={open}
        onOpenChange={setOpen}
        title={text.marginsTitle}
        description={
          rows ? text.marginsSummary(rows.filter((row) => row.cheaper).length) : undefined
        }
      >
        {!rows ? (
          <div className="grid h-32 place-items-center">
            <Art name="coins" size={72} />
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((row) => (
              <li key={row.productId} className="py-3">
                <div className="flex items-center gap-3">
                  <Art name={toArtName(row.art)} size={48} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold">{row.name}</p>
                    <p className="truncate text-sm text-ink-muted tabular-nums">
                      {text.sellCost(
                        formatMoney(row.pricePaise),
                        formatMoney(row.costPaise),
                        row.distributor,
                      )}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-bold text-success tabular-nums">
                    {text.profit(formatMoney(row.profitPaise), row.percent)}
                  </span>
                </div>
                {row.cheaper && (
                  <p className="mt-2 ml-15 rounded-xl bg-tint-mint px-3 py-2 text-sm font-medium">
                    {text.cheaperAt(
                      row.cheaper.distributor,
                      formatMoney(row.cheaper.costPaise),
                      formatMoney(row.cheaper.savingPaise),
                    )}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Sheet>
    </>
  );
}

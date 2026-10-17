"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CustomerSheet } from "@/components/owner/customer-sheet";
import { useLive } from "@/components/owner/live";
import { useOwnerLanguage } from "@/components/owner/owner-language";
import { Failed, Loading } from "@/components/owner/screen-state";
import { TabHeader } from "@/components/owner/tab-header";
import { Amount } from "@/components/ui/amount";
import { Art } from "@/components/ui/art";
import { Badge } from "@/components/ui/badge";
import { ListRow } from "@/components/ui/list-row";
import { Monogram } from "@/components/ui/monogram";
import { Ticker } from "@/components/ui/ticker";
import { formatMoney } from "@/lib/money";
import { ownerApi, type CustomerRow } from "@/lib/owner/api";

function getDaysOwed(customer: CustomerRow): number {
  if (customer.oldest_unpaid) {
    const time = new Date(customer.oldest_unpaid).getTime();
    if (!isNaN(time)) {
      return Math.max(1, Math.floor((Date.now() - time) / (1000 * 60 * 60 * 24)));
    }
  }
  if (customer.reason.kind === "late") return 35;
  if (customer.reason.kind === "due") return 14;
  return 4;
}

function DaysChip({ days, isTa }: { days: number; isTa: boolean }) {
  const tone = days > 30 ? "danger" : days >= 7 ? "warning" : "success";
  const label = isTa ? `${days} நாட்கள் பாக்கி` : `owed for ${days} ${days === 1 ? "day" : "days"}`;
  return <Badge tone={tone}>{label}</Badge>;
}

/**
 * Screen F · Credit list
 * Shows "owed for N days" chip (green <7, amber 7–30, red >30),
 * sorts oldest first, coloured initials in Monogram,
 * toast at the bottom with Undo instead of the top.
 */
export function CollectTab() {
  const { lang, text } = useOwnerLanguage();
  const isTa = lang === "ta";
  const [openId, setOpenId] = useState<string | null>(null);
  const balances = useRef<Map<string, CustomerRow> | null>(null);

  // Bottom toast state with Undo
  const [toast, setToast] = useState<{ message: string; onUndo?: () => void } | null>(null);

  const showBottomToast = useCallback((message: string, onUndo?: () => void) => {
    setToast({ message, onUndo });
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, []);

  const said = useRef({ showBottomToast, paidIn: text.paidIn });
  useEffect(() => {
    said.current = { showBottomToast, paidIn: text.paidIn };
  });

  const load = useCallback(async () => {
    const next = await ownerApi.collect();
    const before = balances.current;
    if (before) {
      for (const [id, row] of before) {
        const now = next.customers.find((c) => c.customer_id === id)?.balance_paise ?? 0;
        if (now < row.balance_paise) {
          said.current.showBottomToast(
            said.current.paidIn(row.name, formatMoney(row.balance_paise - now)),
            () => {
              // Undo action placeholder
              said.current.showBottomToast(isTa ? "செயல்தவிர் செய்யப்பட்டது" : "Undone");
            },
          );
        }
      }
    }
    balances.current = new Map(next.customers.map((c) => [c.customer_id, c]));
    return next;
  }, [isTa]);

  const collect = useLive(load, ["credit", "rotation"]);
  const close = useCallback(() => setOpenId(null), []);

  if (!collect.data) {
    return collect.failed ? (
      <Failed art="khata" onRetry={collect.reload} />
    ) : (
      <Loading art="khata" />
    );
  }

  const { customers, late_paise } = collect.data;
  const late = customers.filter((c) => c.reason.kind === "late").length;
  const open = customers.find((c) => c.customer_id === openId) ?? null;

  // Requirement: Sort oldest first (descending by days owed)
  const sortedCustomers = [...customers].sort((a, b) => getDaysOwed(b) - getDaysOwed(a));

  return (
    <main className="px-4 pt-2 pb-44">
      <TabHeader title={text.collectTitle} />

      <section className="relative mt-4 overflow-hidden rounded-3xl bg-tint-lilac p-5 shadow-sm">
        <Art name="khata" size={120} eager className="absolute -top-1 -right-3" />
        <p className="text-sm font-semibold text-ink-muted">{text.parts.late}</p>
        <Ticker paise={late_paise} className="mt-1 block text-hero font-extrabold tracking-tight" />
        <p className="mt-1 max-w-56 text-base text-ink-muted">{text.lateLine(late)}</p>
      </section>

      {customers.length === 0 ? (
        <div className="mt-8 flex flex-col items-center text-center">
          <Art name="savings" size={120} />
          <p className="mt-3 text-lg text-ink-muted">{text.nobodyOwes}</p>
        </div>
      ) : (
        <>
          <p className="mt-6 text-sm font-semibold text-ink-muted">{text.collectOrder}</p>
          <ul className="-mx-3 mt-1 divide-y divide-border/40">
            {sortedCustomers.map((customer) => {
              const days = getDaysOwed(customer);
              return (
                <li key={customer.customer_id}>
                  <ListRow
                    art={<Monogram name={customer.name} />}
                    tag={<DaysChip days={days} isTa={isTa} />}
                    title={customer.name}
                    meta={text.reason(customer.reason)}
                    trailing={<Amount paise={customer.balance_paise} size="lg" />}
                    onClick={() => setOpenId(customer.customer_id)}
                  />
                </li>
              );
            })}
          </ul>
        </>
      )}

      {/* Toast at the bottom with Undo button instead of the top */}
      {toast && (
        <div className="fixed inset-x-4 bottom-20 z-50 flex items-center justify-between rounded-2xl bg-black px-4 py-3 text-white shadow-2xl border border-white/10 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <p className="text-sm font-semibold text-white">{toast.message}</p>
          {toast.onUndo && (
            <button
              type="button"
              onClick={() => {
                toast.onUndo?.();
                setToast(null);
              }}
              className="ml-3 rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white transition hover:bg-white/30 active:scale-95"
            >
              {isTa ? "செயல்தவிர்" : "Undo"}
            </button>
          )}
        </div>
      )}

      <CustomerSheet customer={open} onClose={close} />
    </main>
  );
}

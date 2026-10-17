import type { ShopData } from "@/lib/rotation/load";
import { shopDate } from "@/lib/time";

/**
 * The shop's data as it stood at an earlier moment: only what existed then, and bills unpaid if
 * they were paid later. The statement's month ends and the money cycle's first week use it.
 */
export function asOf(data: ShopData, instant: Date): ShopData {
  const at = instant.toISOString();
  return {
    ...data,
    now: instant,
    today: shopDate(instant),
    customers: data.customers.map((c) => ({ ...c, entries: c.entries.filter((e) => e.at <= at) })),
    payables: data.payables
      .filter((p) => p.createdAt <= at)
      .map((p) => ({ ...p, paid: p.paidAt !== null && p.paidAt <= at })),
    dayCloses: data.dayCloses.filter((d) => d.recordedAt <= at),
    payments: data.payments.filter((p) => p.paidAt <= at),
    counts: data.counts.filter((c) => c.at <= at),
    receipts: data.receipts.filter((r) => r.at <= at),
  };
}

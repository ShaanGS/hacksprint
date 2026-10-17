import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { appEnv, demoMode } from "@/lib/env";
import { asOf } from "@/lib/rotation/as-of";
import type { ShopData } from "@/lib/rotation/load";
import { snapshotOf } from "@/lib/rotation/snapshot";
import { statementBlocks, type StatementBlocks } from "@/lib/rotation/statement";
import type { Shop } from "@/lib/shop";
import type { StoredStatement } from "@/lib/statement/load";
import { lastFullMonths } from "@/lib/time";

// The shop statement (D1, D2): worked out from the records, then frozen with a share link, as a
// document should be. Totals only: no customer names or phone numbers (spec rule 7).

export type StatementPayload = {
  shop: string;
  period: { from: string; to: string };
  generated_at: string;
  demo_data: boolean;
  blocks: StatementBlocks;
};

function monthEnd(month: string): Date {
  const [year, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(year, m, 0)).toISOString().slice(0, 10);
  return new Date(`${last}T23:59:59+05:30`);
}

export function statementPayload(shop: Shop, data: ShopData): StatementPayload {
  const months = lastFullMonths(data.today, 3);
  const bills = new Map<string, { billedOn: string; totalPaise: number }>();
  for (const receipt of data.receipts) {
    const bill = bills.get(receipt.billId) ?? { billedOn: receipt.billedOn, totalPaise: 0 };
    bills.set(receipt.billId, { ...bill, totalPaise: bill.totalPaise + receipt.lineTotalPaise });
  }
  const cycle = snapshotOf(data).cycle;
  const blocks = statementBlocks({
    months,
    payments: data.payments,
    dayCloses: data.dayCloses,
    customers: data.customers,
    bills: [...bills.values()],
    payables: data.payables.map((p) => ({
      dueDate: p.dueDate,
      paidAt: p.paidAt,
      paidVia: p.paidVia,
      amountPaise: p.amountPaise,
    })),
    stockValueByMonth: months.map((month) => snapshotOf(asOf(data, monthEnd(month))).onShelf.paise),
    moneyCycleDays: cycle === null ? null : Math.round(cycle.days * 10) / 10,
  });
  return {
    shop: shop.name,
    period: { from: `${months[0]}-01`, to: monthEnd(months[2]).toISOString().slice(0, 10) },
    generated_at: data.now.toISOString(),
    demo_data: demoMode(),
    blocks,
  };
}

/** Freezes a statement and returns its id and share link; typed as it is read back. */
export async function saveStatement(db: SupabaseClient, shopId: string, payload: StoredStatement) {
  const shareToken = randomBytes(12).toString("base64url");
  const { data, error } = await db
    .from("statements")
    .insert({
      shop_id: shopId,
      period_start: payload.period.from,
      period_end: payload.period.to,
      payload,
      share_token: shareToken,
    })
    .select("id")
    .single();
  if (error) throw new Error(`Could not save the statement: ${error.message}`);
  return {
    id: z.object({ id: z.string() }).parse(data).id,
    shareUrl: `${appEnv().APP_URL}/statement/${shareToken}`,
  };
}

/** The statement as docs/api.md shows it: snake case, totals only. The rows stay on the page. */
export function statementJson(payload: StatementPayload) {
  const { months, verified, declared } = payload.blocks;
  const monthly = (metric: { label: string; byMonth: number[] }) => ({
    label: metric.label,
    by_month: metric.byMonth,
  });
  return {
    shop: payload.shop,
    period: payload.period,
    generated_at: payload.generated_at,
    demo_data: payload.demo_data,
    months,
    verified: {
      digital_payments: monthly(verified.digitalPayments),
      credit_recovered_by_link: {
        ...monthly(verified.creditRecoveredByLink),
        median_days: verified.creditRecoveredByLink.medianDays,
      },
      supplier_bills: { ...monthly(verified.supplierBills), count: verified.supplierBills.count },
    },
    declared: {
      cash_sales: monthly(declared.cashSales),
      credit_given: monthly(declared.creditGiven),
      credit_recovered_cash: monthly(declared.creditRecoveredCash),
      bills_paid_on_time: {
        label: declared.billsPaidOnTime.label,
        percent: declared.billsPaidOnTime.percent,
        bills: declared.billsPaidOnTime.bills,
      },
      regular_credit_customers: declared.regularCreditCustomers,
      average_stock_value: {
        label: declared.averageStockValue.label,
        paise: declared.averageStockValue.paise,
      },
      money_cycle_days: declared.moneyCycleDays,
    },
  };
}

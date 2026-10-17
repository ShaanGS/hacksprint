import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { loadCatalog, type Product } from "@/lib/catalog";
import { langs } from "@/lib/i18n/languages";
import type { CustomerLedger } from "@/lib/rotation/credit";
import type { Cost, DayClose, Payable, Payment } from "@/lib/rotation/forecast";
import { sourceLabels } from "@/lib/rotation/labels";
import type { Count, Receipt } from "@/lib/rotation/stock";
import { lastFullMonths, shopDate } from "@/lib/time";

// Everything the money calculations read, in one parallel round of queries (no N+1). Times
// become ISO UTC strings here, so the pure functions can compare them as text.

export type ShopPayable = Payable & {
  kind: "supplier_bill" | "loan_emi";
  distributorId: string;
  paidVia: string | null;
  createdAt: string;
};
export type ShopPayment = Payment & { id: string; customerId: string | null };
export type ShopReceipt = Receipt & {
  billId: string;
  billedOn: string;
  lineTotalPaise: number;
  distributorId: string | null;
  distributor: string | null;
};

export type ShopData = {
  now: Date;
  today: string;
  customers: CustomerLedger[];
  payables: ShopPayable[];
  costs: Cost[];
  dayCloses: DayClose[];
  payments: ShopPayment[];
  products: Product[];
  counts: Count[];
  receipts: ShopReceipt[];
};

const iso = (value: string) => new Date(value).toISOString();
const label = z.enum(sourceLabels);

const customerRow = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string(),
  lang: z.enum(langs).nullable(),
});
const ledgerRow = z.object({
  customer_id: z.string(),
  amount_paise: z.number().int(),
  source: label,
  created_at: z.string(),
});
const payableRow = z.object({
  id: z.string(),
  distributor_id: z.string(),
  amount_paise: z.number().int(),
  due_date: z.string(),
  paid_at: z.string().nullable(),
  paid_via: z.string().nullable(),
  kind: z.enum(["supplier_bill", "loan_emi"]),
  created_at: z.string(),
  distributors: z.object({ name: z.string() }),
  bills: z
    .object({ bill_number: z.string().nullable(), purchase_order_id: z.string().nullable() })
    .nullable(),
});
const costRow = z.object({
  kind: z.string(),
  amount_paise: z.number().int(),
  period: z.enum(["week", "month"]),
});
const dayCloseRow = z.object({
  business_date: z.string(),
  cash_sales_paise: z.number().int().nullable(),
  money_in_hand_paise: z.number().int().nullable(),
  recorded_at: z.string(),
});
const paymentRow = z.object({
  id: z.string(),
  amount_paise: z.number().int(),
  paid_at: z.string(),
  is_credit_repayment: z.boolean(),
  customer_id: z.string().nullable(),
});
const countRow = z.object({
  product_id: z.string(),
  counted_qty: z.coerce.number(),
  counted_at: z.string(),
});
const receiptRow = z.object({
  product_id: z.string(),
  qty: z.coerce.number(),
  unit_cost_paise: z.number().int(),
  line_total_paise: z.number().int(),
  created_at: z.string(),
  bill_id: z.string(),
  bills: z.object({
    billed_on: z.string().nullable(),
    distributor_id: z.string().nullable(),
    distributors: z.object({ name: z.string() }).nullable(),
  }),
});

function check<T>(
  result: { data: unknown; error: { message: string } | null },
  schema: z.ZodType<T>,
  what: string,
): T {
  if (result.error) throw new Error(`Could not read ${what}: ${result.error.message}`);
  return schema.parse(result.data);
}

/** Back to the start of the statement's first month, which also covers 28 days and 8 weeks. */
export function historyStart(today: string): string {
  return `${lastFullMonths(today, 3)[0]}-01`;
}

export async function loadShopData(
  db: SupabaseClient,
  shopId: string,
  now = new Date(),
): Promise<ShopData> {
  const today = shopDate(now);
  const since = historyStart(today);
  const sinceInstant = new Date(`${since}T00:00:00+05:30`).toISOString();
  const [customers, ledger, payables, costs, dayCloses, payments, products, counts, receipts] =
    await Promise.all([
      db.from("customers").select("id, name, phone, lang").eq("shop_id", shopId),
      db
        .from("credit_ledger")
        .select("customer_id, amount_paise, source, created_at")
        .eq("shop_id", shopId),
      db
        .from("payables")
        .select(
          "id, distributor_id, amount_paise, due_date, paid_at, paid_via, kind, created_at, distributors(name), bills(bill_number, purchase_order_id)",
        )
        .eq("shop_id", shopId),
      db.from("shop_costs").select("kind, amount_paise, period").eq("shop_id", shopId),
      db
        .from("day_close")
        .select("business_date, cash_sales_paise, money_in_hand_paise, recorded_at")
        .eq("shop_id", shopId)
        .gte("business_date", since),
      db
        .from("payments")
        .select("id, amount_paise, paid_at, is_credit_repayment, customer_id")
        .eq("shop_id", shopId)
        .eq("status", "paid")
        .is("purchase_order_id", null)
        .gte("paid_at", sinceInstant),
      loadCatalog(db, shopId),
      db.from("shelf_counts").select("product_id, counted_qty, counted_at").eq("shop_id", shopId),
      db
        .from("bill_items")
        .select(
          "product_id, qty, unit_cost_paise, line_total_paise, created_at, bill_id, bills!inner(shop_id, status, billed_on, distributor_id, distributors(name))",
        )
        .eq("bills.shop_id", shopId)
        .eq("bills.status", "confirmed"),
    ]);

  const entries = check(ledger, z.array(ledgerRow), "the credit book");
  return {
    now,
    today,
    customers: check(customers, z.array(customerRow), "the customers").map((c) => ({
      customerId: c.id,
      name: c.name,
      phone: c.phone,
      lang: c.lang,
      entries: entries
        .filter((e) => e.customer_id === c.id)
        .map((e) => ({ at: iso(e.created_at), amountPaise: e.amount_paise, source: e.source })),
    })),
    payables: check(payables, z.array(payableRow), "what the shop owes").map((p) => ({
      id: p.id,
      amountPaise: p.amount_paise,
      dueDate: p.due_date,
      paid: p.paid_at !== null,
      paidAt: p.paid_at === null ? null : iso(p.paid_at),
      paidVia: p.paid_via,
      kind: p.kind,
      createdAt: iso(p.created_at),
      distributorId: p.distributor_id,
      distributor: p.distributors.name,
      billNumber: p.bills?.bill_number ?? null,
      purchaseOrderId: p.bills?.purchase_order_id ?? null,
    })),
    costs: check(costs, z.array(costRow), "the weekly costs").map((c) => ({
      kind: c.kind,
      amountPaise: c.amount_paise,
      period: c.period,
    })),
    dayCloses: check(dayCloses, z.array(dayCloseRow), "the day closes").map((d) => ({
      businessDate: d.business_date,
      cashSalesPaise: d.cash_sales_paise,
      moneyInHandPaise: d.money_in_hand_paise,
      recordedAt: iso(d.recorded_at),
    })),
    payments: check(payments, z.array(paymentRow), "the payments").map((p) => ({
      id: p.id,
      paidAt: iso(p.paid_at),
      amountPaise: p.amount_paise,
      isCreditRepayment: p.is_credit_repayment,
      customerId: p.customer_id,
    })),
    products,
    counts: check(counts, z.array(countRow), "the shelf counts").map((c) => ({
      productId: c.product_id,
      qty: c.counted_qty,
      at: iso(c.counted_at),
    })),
    receipts: check(receipts, z.array(receiptRow), "the bill lines").map((r) => ({
      productId: r.product_id,
      qty: r.qty,
      at: iso(r.created_at),
      unitCostPaise: r.unit_cost_paise,
      lineTotalPaise: r.line_total_paise,
      billId: r.bill_id,
      billedOn: r.bills.billed_on ?? shopDate(r.created_at),
      distributorId: r.bills.distributor_id,
      distributor: r.bills.distributors?.name ?? null,
    })),
  };
}

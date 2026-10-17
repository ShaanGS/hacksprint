import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { HomeSource, HomeSourceKind } from "@/lib/sources/types";

// The rows behind each home number. Each query uses the same filter as home_numbers, so the rows
// add up to the number the owner tapped.

const sum = (rows: { amountPaise: number }[]) =>
  rows.reduce((total, row) => total + row.amountPaise, 0);

const orderRow = z.object({
  number: z.coerce.number(),
  total_paise: z.number().int(),
  submitted_at: z.string(),
  customers: z.object({ name: z.string() }),
});
const paymentRow = z.object({
  amount_paise: z.number().int(),
  paid_at: z.string(),
  provider_txn_id: z.string().nullable(),
  orders: z.object({ number: z.coerce.number(), customers: z.object({ name: z.string() }) }),
});
const ledgerRow = z.object({
  amount_paise: z.number().int(),
  customer_id: z.string(),
  customers: z.object({ name: z.string() }),
});
const payableRow = z.object({
  amount_paise: z.number().int(),
  due_date: z.string(),
  distributors: z.object({ name: z.string() }),
  bills: z.object({ bill_number: z.string().nullable() }),
});

export async function homeSource(
  db: SupabaseClient,
  shopId: string,
  kind: HomeSourceKind,
  since: Date,
): Promise<HomeSource> {
  switch (kind) {
    case "orders":
      return ordersSaved(db, shopId, since);
    case "collected":
      return collected(db, shopId, since);
    case "owed-to-shop":
      return owedToShop(db, shopId);
    case "owed-by-shop":
      return owedByShop(db, shopId);
  }
}

async function ordersSaved(db: SupabaseClient, shopId: string, since: Date): Promise<HomeSource> {
  const { data, error } = await db
    .from("orders")
    .select("number, total_paise, submitted_at, customers(name)")
    .eq("shop_id", shopId)
    .gte("submitted_at", since.toISOString())
    .not("status", "in", "(draft,rejected)")
    .order("submitted_at", { ascending: false });
  if (error) throw new Error(`Could not read today's orders: ${error.message}`);
  const rows = z
    .array(orderRow)
    .parse(data)
    .map((row) => ({
      orderNumber: row.number,
      customer: row.customers.name,
      amountPaise: row.total_paise,
      at: row.submitted_at,
    }));
  return { kind: "orders", totalPaise: sum(rows), rows };
}

async function collected(db: SupabaseClient, shopId: string, since: Date): Promise<HomeSource> {
  const { data, error } = await db
    .from("payments")
    .select(
      "amount_paise, paid_at, provider_txn_id, orders!inner(number, shop_id, customers(name))",
    )
    .eq("orders.shop_id", shopId)
    .eq("status", "paid")
    .gte("paid_at", since.toISOString())
    .order("paid_at", { ascending: false });
  if (error) throw new Error(`Could not read today's payments: ${error.message}`);
  const rows = z
    .array(paymentRow)
    .parse(data)
    .map((row) => ({
      orderNumber: row.orders.number,
      customer: row.orders.customers.name,
      amountPaise: row.amount_paise,
      at: row.paid_at,
      reference: row.provider_txn_id,
    }));
  return { kind: "collected", totalPaise: sum(rows), rows };
}

/** Each customer's balance: credit sales minus repayments, most owed first. */
async function owedToShop(db: SupabaseClient, shopId: string): Promise<HomeSource> {
  const { data, error } = await db
    .from("credit_ledger")
    .select("amount_paise, customer_id, customers(name)")
    .eq("shop_id", shopId);
  if (error) throw new Error(`Could not read the credit book: ${error.message}`);
  const owed = new Map<string, { customer: string; amountPaise: number }>();
  for (const row of z.array(ledgerRow).parse(data)) {
    const entry = owed.get(row.customer_id) ?? { customer: row.customers.name, amountPaise: 0 };
    owed.set(row.customer_id, { ...entry, amountPaise: entry.amountPaise + row.amount_paise });
  }
  const rows = [...owed.values()]
    .filter((row) => row.amountPaise !== 0)
    .sort((a, b) => b.amountPaise - a.amountPaise);
  return { kind: "owed-to-shop", totalPaise: sum(rows), rows };
}

async function owedByShop(db: SupabaseClient, shopId: string): Promise<HomeSource> {
  const { data, error } = await db
    .from("payables")
    .select("amount_paise, due_date, distributors(name), bills(bill_number)")
    .eq("shop_id", shopId)
    .is("paid_at", null)
    .order("due_date");
  if (error) throw new Error(`Could not read what the shop owes: ${error.message}`);
  const rows = z
    .array(payableRow)
    .parse(data)
    .map((row) => ({
      distributor: row.distributors.name,
      billNumber: row.bills.bill_number,
      amountPaise: row.amount_paise,
      due: row.due_date,
    }));
  return { kind: "owed-by-shop", totalPaise: sum(rows), rows };
}

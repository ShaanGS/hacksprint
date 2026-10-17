import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { audit } from "@/lib/audit";
import type { CreditBook, CreditEntry } from "@/lib/credit/types";
import { HttpError } from "@/lib/http";

const ledgerRow = z.object({
  customer_id: z.string(),
  amount_paise: z.number().int(),
  created_at: z.string(),
  customers: z.object({ name: z.string() }),
});
const customerRow = z.object({ id: z.string(), name: z.string() });
const entryRow = z.object({
  created_at: z.string(),
  kind: z.enum(["credit_sale", "repayment"]),
  amount_paise: z.number().int(),
  note: z.string().nullable(),
  orders: z.object({ number: z.coerce.number() }).nullable(),
});

/** Every customer who owes the shop, most first, with when they last bought or paid. */
export async function creditBook(db: SupabaseClient, shopId: string): Promise<CreditBook> {
  const { data, error } = await db
    .from("credit_ledger")
    .select("customer_id, amount_paise, created_at, customers(name)")
    .eq("shop_id", shopId);
  if (error) throw new Error(`Could not read the credit book: ${error.message}`);
  const book = new Map<string, { id: string; name: string; owedPaise: number; lastAt: string }>();
  for (const row of z.array(ledgerRow).parse(data)) {
    const entry = book.get(row.customer_id) ?? {
      id: row.customer_id,
      name: row.customers.name,
      owedPaise: 0,
      lastAt: row.created_at,
    };
    book.set(row.customer_id, {
      ...entry,
      owedPaise: entry.owedPaise + row.amount_paise,
      lastAt: row.created_at > entry.lastAt ? row.created_at : entry.lastAt,
    });
  }
  const customers = [...book.values()]
    .filter((customer) => customer.owedPaise !== 0)
    .sort((a, b) => b.owedPaise - a.owedPaise);
  return { totalPaise: customers.reduce((sum, c) => sum + c.owedPaise, 0), customers };
}

/** One customer's entries, newest first: they add up to what the customer owes (spec E3). */
export async function creditEntries(
  db: SupabaseClient,
  shopId: string,
  customerId: string,
): Promise<CreditEntry[]> {
  const { data, error } = await db
    .from("credit_ledger")
    .select("created_at, kind, amount_paise, note, orders(number)")
    .eq("shop_id", shopId)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Could not read the customer's credit: ${error.message}`);
  return z
    .array(entryRow)
    .parse(data)
    .map((row) => ({
      at: row.created_at,
      kind: row.kind,
      amountPaise: row.amount_paise,
      orderNumber: row.orders?.number ?? null,
      note: row.note,
    }));
}

export async function shopCustomers(db: SupabaseClient, shopId: string) {
  const { data, error } = await db
    .from("customers")
    .select("id, name")
    .eq("shop_id", shopId)
    .order("name");
  if (error) throw new Error(`Could not read the customers: ${error.message}`);
  return z.array(customerRow).parse(data);
}

/** The owner's yes: a credit sale on the customer's account, with the words that were heard. */
export async function addSpokenCredit(
  db: SupabaseClient,
  shopId: string,
  entry: { customerId: string; amountPaise: number; heard: string },
): Promise<void> {
  const customers = await shopCustomers(db, shopId);
  if (!customers.some((customer) => customer.id === entry.customerId)) {
    throw new HttpError(400, "No such customer.");
  }
  const { data, error } = await db
    .from("credit_ledger")
    .insert({
      shop_id: shopId,
      customer_id: entry.customerId,
      kind: "credit_sale",
      amount_paise: entry.amountPaise,
      note: entry.heard,
    })
    .select("id")
    .single();
  if (error) throw new Error(`Could not add to the credit book: ${error.message}`);
  await audit(db, shopId, [
    {
      actor: "owner",
      action: "credit.spoken",
      entityType: "credit_ledger",
      entityId: z.object({ id: z.string() }).parse(data).id,
      payload: { customerId: entry.customerId, amountPaise: entry.amountPaise, heard: entry.heard },
    },
  ]);
}

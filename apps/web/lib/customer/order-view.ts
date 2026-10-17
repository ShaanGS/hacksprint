import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { OrderView } from "@/lib/customer/backend";
import { HttpError } from "@/lib/http";

const viewRow = z.object({
  id: z.string(),
  number: z.coerce.number(),
  status: z.enum([
    "pending_approval",
    "rejected",
    "awaiting_payment",
    "paid",
    "on_credit",
    "delivered",
  ]),
  payment_mode: z.enum(["link", "credit"]).nullable(),
  total_paise: z.number().int(),
  reject_reason: z.enum(["out_of_stock", "shop_closed", "cannot_deliver", "other"]).nullable(),
  order_items: z.array(z.object({ products: z.object({ art: z.string() }) })),
  payments: z.array(z.object({ link_url: z.string().nullable(), status: z.string() })),
});

const balanceRow = z.object({ amount_paise: z.number().int() });
const numberRow = z.object({ number: z.coerce.number() });

/** One of this customer's sent orders, as the status page shows it. Another customer's is 404. */
export async function orderView(
  db: SupabaseClient,
  customerId: string,
  number: number,
): Promise<OrderView> {
  const { data, error } = await db
    .from("orders")
    .select(
      "id, number, status, payment_mode, total_paise, reject_reason, order_items(products(art)), payments(link_url, status)",
    )
    .eq("customer_id", customerId)
    .eq("number", number)
    .neq("status", "draft")
    .maybeSingle();
  if (error) throw new Error(`Could not read order ${number}: ${error.message}`);
  if (!data) throw new HttpError(404, "We could not find that order.");
  const row = viewRow.parse(data);
  const live = row.payments.find((p) => p.status === "created" || p.status === "paid");
  return {
    number: row.number,
    status: row.status,
    paymentMode: row.payment_mode ?? "link",
    itemCount: row.order_items.length,
    arts: row.order_items.slice(0, 3).map((line) => line.products.art),
    totalPaise: row.total_paise,
    rejectReason: row.reject_reason,
    balancePaise: row.status === "on_credit" ? await balanceOf(db, customerId) : null,
    confirming: false,
    payUrl: row.status === "awaiting_payment" ? (live?.link_url ?? null) : null,
  };
}

/** What the customer owes the shop now: credit sales minus repayments. */
async function balanceOf(db: SupabaseClient, customerId: string): Promise<number> {
  const { data, error } = await db
    .from("credit_ledger")
    .select("amount_paise")
    .eq("customer_id", customerId);
  if (error) throw new Error(`Could not read the credit book: ${error.message}`);
  return z
    .array(balanceRow)
    .parse(data)
    .reduce((total, row) => total + row.amount_paise, 0);
}

/** The order this customer is waiting on today, if any: a rescan takes them back to it. */
export async function activeOrderNumber(
  db: SupabaseClient,
  customerId: string,
): Promise<number | null> {
  const since = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
  const { data, error } = await db
    .from("orders")
    .select("number")
    .eq("customer_id", customerId)
    .in("status", ["pending_approval", "awaiting_payment", "paid", "on_credit"])
    .gte("submitted_at", since)
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Could not read the customer's orders: ${error.message}`);
  return data ? numberRow.parse(data).number : null;
}

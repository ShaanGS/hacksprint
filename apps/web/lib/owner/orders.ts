import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { langs } from "@/lib/i18n/languages";
import { lineTotalPaise } from "@/lib/orders/totals";
import type { OwnerOrder } from "@/lib/owner/types";

// The owner's order list (GET /api/orders): today's orders and anything still open, in four
// queries whatever the number of orders (no N+1).

const OPEN = ["pending_approval", "awaiting_payment", "paid", "on_credit"] as const;

const orderRow = z.object({
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
  submitted_at: z.string().nullable(),
  lang: z.enum(langs).nullable(),
  customer_id: z.string(),
  customers: z.object({ name: z.string() }),
  order_items: z.array(
    z.object({
      qty: z.coerce.number(),
      unit_price_paise: z.number().int(),
      products: z.object({
        code: z.string(),
        name: z.string(),
        art: z.string(),
        unit: z.enum(["kg", "litre", "pack", "piece"]),
      }),
    }),
  ),
  payments: z.array(z.object({ link_url: z.string().nullable(), status: z.string() })),
});
const ledgerRow = z.object({ customer_id: z.string(), amount_paise: z.number().int() });
const historyRow = z.object({ customer_id: z.string() });
const turnRow = z.object({
  order_id: z.string(),
  items: z.array(z.object({ name: z.string(), state: z.string() })),
});

const timeOfDay = new Intl.DateTimeFormat("en-IN", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: "Asia/Kolkata",
});

export async function ownerOrders(
  db: SupabaseClient,
  shopId: string,
  since: Date,
): Promise<OwnerOrder[]> {
  const { data, error } = await db
    .from("orders")
    .select(
      "id, number, status, payment_mode, total_paise, reject_reason, submitted_at, lang, customer_id, customers(name), order_items(qty, unit_price_paise, products(code, name, art, unit)), payments(link_url, status)",
    )
    .eq("shop_id", shopId)
    .neq("status", "draft")
    .or(`submitted_at.gte."${since.toISOString()}",status.in.(${OPEN.join(",")})`)
    .order("submitted_at", { ascending: false })
    .limit(60);
  if (error) throw new Error(`Could not read the orders: ${error.message}`);
  const rows = z.array(orderRow).parse(data);
  if (rows.length === 0) return [];

  const customerIds = [...new Set(rows.map((row) => row.customer_id))];
  const [owed, orderCounts, outOfStock] = await Promise.all([
    balances(db, customerIds),
    countOrders(db, customerIds),
    outOfStockNames(
      db,
      rows.map((row) => row.id),
    ),
  ]);

  return rows.map((row) => {
    const live = row.payments.find((p) => p.status === "created" || p.status === "paid");
    return {
      id: row.id,
      number: row.number,
      customer: row.customers.name,
      lang: row.lang,
      newCustomer: (orderCounts.get(row.customer_id) ?? 0) <= 1,
      balancePaise: owed.get(row.customer_id) ?? 0,
      placedAt: row.submitted_at ? timeOfDay.format(new Date(row.submitted_at)) : "",
      status: row.status,
      paymentMode: row.payment_mode ?? "link",
      lines: row.order_items.map((line) => ({
        code: line.products.code,
        name: line.products.name,
        art: line.products.art,
        qty: line.qty,
        unit: line.products.unit,
        lineTotalPaise: lineTotalPaise({ qty: line.qty, unitPricePaise: line.unit_price_paise }),
      })),
      totalPaise: row.total_paise,
      outOfStock: outOfStock.get(row.id) ?? [],
      rejectReason: row.reject_reason,
      payUrl: live?.link_url ?? null,
    };
  });
}

/** What each customer owes now: credit sales minus repayments. */
async function balances(db: SupabaseClient, customerIds: string[]): Promise<Map<string, number>> {
  const { data, error } = await db
    .from("credit_ledger")
    .select("customer_id, amount_paise")
    .in("customer_id", customerIds);
  if (error) throw new Error(`Could not read the credit book: ${error.message}`);
  const owed = new Map<string, number>();
  for (const row of z.array(ledgerRow).parse(data)) {
    owed.set(row.customer_id, (owed.get(row.customer_id) ?? 0) + row.amount_paise);
  }
  return owed;
}

/** How many orders each customer has sent; one means this is their first. */
async function countOrders(
  db: SupabaseClient,
  customerIds: string[],
): Promise<Map<string, number>> {
  const { data, error } = await db
    .from("orders")
    .select("customer_id")
    .in("customer_id", customerIds)
    .neq("status", "draft");
  if (error) throw new Error(`Could not read order history: ${error.message}`);
  const counts = new Map<string, number>();
  for (const row of z.array(historyRow).parse(data)) {
    counts.set(row.customer_id, (counts.get(row.customer_id) ?? 0) + 1);
  }
  return counts;
}

/** What was out of stock, from the product cards the shop showed while taking each order. */
async function outOfStockNames(
  db: SupabaseClient,
  orderIds: string[],
): Promise<Map<string, string[]>> {
  const { data, error } = await db
    .from("voice_turns")
    .select("order_id, items")
    .in("order_id", orderIds)
    .eq("role", "shop");
  if (error) throw new Error(`Could not read the conversations: ${error.message}`);
  const out = new Map<string, Set<string>>();
  for (const turn of z.array(turnRow).parse(data)) {
    for (const item of turn.items.filter((i) => i.state === "out_of_stock")) {
      out.set(turn.order_id, (out.get(turn.order_id) ?? new Set()).add(item.name));
    }
  }
  return new Map([...out].map(([orderId, names]) => [orderId, [...names]]));
}

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

const paymentRow = z.object({
  id: z.string(),
  provider: z.string(),
  amount_paise: z.number().int(),
  status: z.string(),
  orders: z.object({ number: z.coerce.number() }).nullable(),
  customers: z.object({ name: z.string() }).nullable(),
  purchase_orders: z.object({ distributors: z.object({ name: z.string() }) }).nullable(),
});

export type PaymentView = {
  id: string;
  provider: string;
  amountPaise: number;
  paid: boolean;
  /** An order's payment shows its number; a credit payment shows whose account it settles. */
  orderNumber: number | null;
  customer: string | null;
  /** A stock order's payment (test mode) shows the distributor it is for. */
  stockOrderFor: string | null;
};

/** A payment as its pay page shows it, or null if there is no such payment. */
export async function paymentView(db: SupabaseClient, id: string): Promise<PaymentView | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const { data, error } = await db
    .from("payments")
    .select(
      "id, provider, amount_paise, status, orders(number), customers(name), purchase_orders(distributors(name))",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Could not read the payment: ${error.message}`);
  if (!data) return null;
  const row = paymentRow.parse(data);
  return {
    id: row.id,
    provider: row.provider,
    amountPaise: row.amount_paise,
    paid: row.status === "paid",
    orderNumber: row.orders?.number ?? null,
    customer: row.customers?.name ?? null,
    stockOrderFor: row.purchase_orders?.distributors.name ?? null,
  };
}

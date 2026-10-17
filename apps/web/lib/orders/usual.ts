import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

const usualRow = z.object({ product_id: z.string(), usual_qty: z.coerce.number() });

export type UsualLine = { productId: string; qty: number };

/**
 * A regular's usual basket (spec A3), from the customer_usual view: what they buy in at least
 * half their orders, at their most common quantity. Empty for a new customer.
 */
export async function usualBasket(db: SupabaseClient, customerId: string): Promise<UsualLine[]> {
  const { data, error } = await db
    .from("customer_usual")
    .select("product_id, usual_qty")
    .eq("customer_id", customerId);
  if (error) throw new Error(`Could not read the usual order: ${error.message}`);
  return z
    .array(usualRow)
    .parse(data)
    .map((row) => ({ productId: row.product_id, qty: row.usual_qty }));
}

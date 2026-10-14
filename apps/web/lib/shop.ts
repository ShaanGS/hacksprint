import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

const shopRow = z.object({
  id: z.string(),
  name: z.string(),
  owner_name: z.string(),
  payment_mode: z.enum(["test", "paytm"]),
});

export type Shop = {
  id: string;
  name: string;
  ownerName: string;
  paymentMode: "test" | "paytm";
};

/**
 * The shop this app runs. There is exactly one (spec section 1). It is looked up rather than set
 * in env because the presenter's demo reset recreates it with a new id.
 */
export async function getShop(db: SupabaseClient): Promise<Shop> {
  const { data, error } = await db
    .from("shops")
    .select("id, name, owner_name, payment_mode")
    .order("created_at")
    .limit(1)
    .single();
  if (error) throw new Error(`Could not load the shop: ${error.message}`);
  const row = shopRow.parse(data);
  return { id: row.id, name: row.name, ownerName: row.owner_name, paymentMode: row.payment_mode };
}

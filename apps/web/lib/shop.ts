import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { isLang, type Lang } from "@/lib/i18n/languages";

const shopRow = z.object({
  id: z.string(),
  name: z.string(),
  owner_name: z.string(),
  owner_language: z.string(),
  payment_mode: z.enum(["test", "paytm", "razorpay"]),
});

export type Shop = {
  id: string;
  name: string;
  ownerName: string;
  /** The language the owner reads and hears the app in. */
  ownerLang: Lang;
  paymentMode: "test" | "paytm" | "razorpay";
};

/**
 * The shop this app runs. There is exactly one (spec section 13). It is looked up rather than set
 * in env because the demo reset recreates it with a new id.
 */
export async function getShop(db: SupabaseClient): Promise<Shop> {
  const { data, error } = await db
    .from("shops")
    .select("id, name, owner_name, owner_language, payment_mode")
    .order("created_at")
    .limit(1)
    .single();
  if (error) throw new Error(`Could not load the shop: ${error.message}`);
  const row = shopRow.parse(data);
  const ownerLang = row.owner_language.slice(0, 2);
  return {
    id: row.id,
    name: row.name,
    ownerName: row.owner_name,
    ownerLang: isLang(ownerLang) ? ownerLang : "ta",
    paymentMode: row.payment_mode,
  };
}

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { HomeNumbers } from "@/lib/sources/types";

const numbersRow = z.object({
  orders_count: z.coerce.number(),
  orders_paise: z.coerce.number(),
  collected_paise: z.coerce.number(),
  owed_to_shop_paise: z.coerce.number(),
  owed_by_shop_paise: z.coerce.number(),
});

/** The owner's home numbers (spec E1), all from one SQL function. */
export async function homeNumbers(
  db: SupabaseClient,
  shopId: string,
  since: Date,
): Promise<HomeNumbers> {
  const { data, error } = await db
    .rpc("home_numbers", { p_shop_id: shopId, p_since: since.toISOString() })
    .single();
  if (error) throw new Error(`Could not work out the home numbers: ${error.message}`);
  const row = numbersRow.parse(data);
  return {
    ordersCount: row.orders_count,
    ordersPaise: row.orders_paise,
    collectedPaise: row.collected_paise,
    owedToShopPaise: row.owed_to_shop_paise,
    owedByShopPaise: row.owed_by_shop_paise,
  };
}

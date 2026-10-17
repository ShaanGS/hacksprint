import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Distributor } from "@/lib/bills/types";

const distributorRow = z.object({ id: z.string(), name: z.string() });

/** The shop's distributors, by name. */
export async function loadDistributors(db: SupabaseClient, shopId: string): Promise<Distributor[]> {
  const { data, error } = await db
    .from("distributors")
    .select("id, name")
    .eq("shop_id", shopId)
    .order("name");
  if (error) throw new Error(`Could not read the distributors: ${error.message}`);
  return z.array(distributorRow).parse(data);
}

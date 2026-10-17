import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { ShopProfile } from "@/lib/schemes/band";

const profileRow = z.object({
  udyam_status: z.enum(["yes", "no", "unsure"]),
  has_pan: z.boolean(),
  repaid_tarun_before: z.boolean(),
});

/** What the loan-ready check needs about the shop; "unsure" and no PAN when nothing was said. */
export async function loadProfile(db: SupabaseClient, shopId: string): Promise<ShopProfile> {
  const { data, error } = await db
    .from("shop_profile")
    .select("udyam_status, has_pan, repaid_tarun_before")
    .eq("shop_id", shopId)
    .maybeSingle();
  if (error) throw new Error(`Could not read the shop profile: ${error.message}`);
  if (!data) return { udyamStatus: "unsure", hasPan: false, repaidTarunBefore: false };
  const row = profileRow.parse(data);
  return {
    udyamStatus: row.udyam_status,
    hasPan: row.has_pan,
    repaidTarunBefore: row.repaid_tarun_before,
  };
}

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { demoPayerPhone } from "@/lib/env";
import { broadcastChanged } from "@/lib/realtime";

// The demo shop, restored in one database call with dates relative to now (spec section 16).
// The first late payer gets a teammate's real WhatsApp number, so the reminder can be paid live.

const ARJUN = "00000000-0000-4000-8000-0000000000c4";

export async function resetDemo(db: SupabaseClient) {
  const reset = await db.rpc("reset_demo");
  if (reset.error) throw new Error(`Could not reset the demo: ${reset.error.message}`);
  const phone = demoPayerPhone();
  if (phone) {
    const { error } = await db.from("customers").update({ phone }).eq("id", ARJUN);
    if (error) throw new Error(`Could not set the demo payer's number: ${error.message}`);
  }
  const shop = await db.from("shops").select("id").limit(1).single();
  if (shop.error) throw new Error(`Could not read the shop: ${shop.error.message}`);
  await broadcastChanged(db, z.object({ id: z.string() }).parse(shop.data).id, [
    "rotation",
    "credit",
    "stock",
  ]);
}

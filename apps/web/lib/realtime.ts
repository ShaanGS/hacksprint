import type { SupabaseClient } from "@supabase/supabase-js";

// After a write that changes the numbers, every open screen refetches (spec section 13). The
// message carries only which area changed; the numbers always come from the API.

export type ChangedArea = "rotation" | "credit" | "stock";

export async function broadcastChanged(db: SupabaseClient, shopId: string, areas: ChangedArea[]) {
  const channel = db.channel(`shop:${shopId}`);
  try {
    await Promise.all(areas.map((area) => channel.httpSend("changed", { area })));
  } catch (error) {
    // The write has happened; screens still refresh on their own timer, so do not fail it.
    console.error(error);
  } finally {
    await db.removeChannel(channel);
  }
}

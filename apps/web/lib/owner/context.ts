import { isOwner } from "@/lib/auth/cookies";
import { HttpError } from "@/lib/http";
import { getShop, type Shop } from "@/lib/shop";
import { createServiceClient } from "@/lib/supabase/server";

/** The owner's session, or 401: every owner route starts here. */
export async function requireOwner(): Promise<{
  db: ReturnType<typeof createServiceClient>;
  shop: Shop;
}> {
  if (!(await isOwner())) throw new HttpError(401, "Enter the shop PIN.");
  const db = createServiceClient();
  return { db, shop: await getShop(db) };
}

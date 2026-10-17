import { timingSafeEqual } from "node:crypto";
import { isOwner } from "@/lib/auth/cookies";
import { appEnv } from "@/lib/env";
import { HttpError } from "@/lib/http";
import { getShop, type Shop } from "@/lib/shop";
import { createServiceClient } from "@/lib/supabase/server";

// Every v4 route starts here (spec section 13). The owner's phone sends the PIN session cookie;
// scripts and n8n send "Authorization: Bearer <SHOP_TOKEN>". Either way the route gets the shop,
// and the service key never leaves the server.

function bearerMatches(request: Request): boolean {
  const header = request.headers.get("authorization") ?? "";
  if (!header.startsWith("Bearer ")) return false;
  const given = Buffer.from(header.slice("Bearer ".length));
  const expected = Buffer.from(appEnv().SHOP_TOKEN);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function requireShop(request: Request): Promise<{
  db: ReturnType<typeof createServiceClient>;
  shop: Shop;
}> {
  if (!bearerMatches(request) && !(await isOwner()))
    throw new HttpError(401, "Enter the shop PIN.");
  const db = createServiceClient();
  return { db, shop: await getShop(db) };
}

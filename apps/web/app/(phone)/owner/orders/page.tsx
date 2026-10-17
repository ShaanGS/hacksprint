import type { Metadata } from "next";
import { connection } from "next/server";
import { OwnerShell } from "@/components/owner/owner-shell";
import { isOwner } from "@/lib/auth/cookies";
import { demoMode } from "@/lib/env";
import { getShop } from "@/lib/shop";
import { createServiceClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Orders" };

/** Order approval for customer voice ordering: frozen, kept working, linked from nowhere. */
export default async function OrdersPage() {
  await connection();
  const [shop, signedIn] = await Promise.all([getShop(createServiceClient()), isOwner()]);
  return (
    <OwnerShell
      screen="orders"
      signedIn={signedIn}
      shopId={shop.id}
      demo={demoMode()}
      ownerLang={shop.ownerLang}
      ownerName={shop.ownerName}
      shopName={shop.name}
    />
  );
}

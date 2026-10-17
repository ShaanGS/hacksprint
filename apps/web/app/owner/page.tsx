import type { Metadata } from "next";
import { connection } from "next/server";
import { OwnerShell } from "@/components/owner/owner-shell";
import { isOwner } from "@/lib/auth/cookies";
import { demoMode } from "@/lib/env";
import { getShop } from "@/lib/shop";
import { createServiceClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Shop" };

/** The owner's phone: where the money is, who to collect from, stock and the bank. */
export default async function OwnerPage() {
  await connection();
  const [shop, signedIn] = await Promise.all([getShop(createServiceClient()), isOwner()]);
  return (
    <OwnerShell
      screen="money"
      signedIn={signedIn}
      shopId={shop.id}
      demo={demoMode()}
      ownerLang={shop.ownerLang}
      ownerName={shop.ownerName}
      shopName={shop.name}
    />
  );
}

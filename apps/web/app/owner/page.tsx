import type { Metadata } from "next";
import { connection } from "next/server";
import { OwnerShell } from "@/components/owner/owner-shell";
import { isOwner } from "@/lib/auth/cookies";
import { isPreview } from "@/lib/env";
import { previewShop } from "@/lib/preview/data";
import { getShop } from "@/lib/shop";
import { createServiceClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Shop" };

/** The owner's phone: orders to approve, stock, credit and the day's numbers. */
export default async function OwnerPage() {
  if (isPreview()) {
    return (
      <OwnerShell
        live={false}
        signedIn
        ownerLang={previewShop.ownerLang}
        ownerName={previewShop.ownerName}
        shopName={previewShop.name}
      />
    );
  }
  await connection();
  const [shop, signedIn] = await Promise.all([getShop(createServiceClient()), isOwner()]);
  return (
    <OwnerShell
      live
      signedIn={signedIn}
      ownerLang={shop.ownerLang}
      ownerName={shop.ownerName}
      shopName={shop.name}
    />
  );
}

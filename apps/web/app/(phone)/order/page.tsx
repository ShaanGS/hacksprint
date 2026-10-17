import type { Metadata } from "next";
import { connection } from "next/server";
import { OrderApp } from "@/components/customer/order-app";
import { isPreview } from "@/lib/env";
import { previewShop } from "@/lib/preview/data";
import { getShop } from "@/lib/shop";
import { createServiceClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Order" };

/** Where the shop's QR code points: the customer orders by voice. */
export default async function OrderPage({
  searchParams,
}: {
  searchParams?: Promise<{ lang?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : undefined;
  const lang = resolvedParams?.lang;

  if (isPreview()) return <OrderApp shopName={previewShop.name} live={false} defaultLang={lang} />;
  // Read at request time: the presenter's reset can recreate the shop.
  await connection();
  const shop = await getShop(createServiceClient());
  return <OrderApp shopName={shop.name} live defaultLang={lang} />;
}

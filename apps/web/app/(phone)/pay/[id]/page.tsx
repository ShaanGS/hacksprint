import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { TestPayment } from "@/components/customer/test-payment";
import { demoMode } from "@/lib/env";
import { paymentView } from "@/lib/payments/view";
import { getShop } from "@/lib/shop";
import { createServiceClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Payment" };

/**
 * Our own payment page for test links: clearly not Paytm's; its button marks the payment paid.
 * Demo only, like its endpoint (POST /api/pay/{id}), because no money moves here.
 */
export default async function PayPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  if (!demoMode()) notFound();
  const db = createServiceClient();
  const [payment, shop] = await Promise.all([paymentView(db, (await params).id), getShop(db)]);
  if (!payment || payment.provider !== "test") notFound();
  return <TestPayment payment={payment} shopName={shop.name} />;
}

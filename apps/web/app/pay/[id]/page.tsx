import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { TestPayment } from "@/components/customer/test-payment";
import { paymentView } from "@/lib/payments/view";
import { getShop } from "@/lib/shop";
import { createServiceClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Payment" };

/** Our own payment page for test links: clearly not Paytm's, and it marks the order paid. */
export default async function PayPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const db = createServiceClient();
  const [payment, shop] = await Promise.all([paymentView(db, (await params).id), getShop(db)]);
  if (!payment || payment.provider !== "test") notFound();
  return <TestPayment payment={payment} shopName={shop.name} />;
}

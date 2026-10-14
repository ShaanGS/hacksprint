import type { Metadata } from "next";
import { OrderApp } from "@/components/customer/order-app";
import { previewShop } from "@/lib/preview/data";

export const metadata: Metadata = { title: "Order" };

/** Where the shop's QR code points: the customer orders by voice. */
export default function OrderPage() {
  return <OrderApp shopName={previewShop.name} />;
}

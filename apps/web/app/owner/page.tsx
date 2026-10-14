import type { Metadata } from "next";
import { OwnerApp } from "@/components/owner/owner-app";

export const metadata: Metadata = { title: "Shop" };

/** The owner's phone: orders to approve, stock, credit and the day's numbers. */
export default function OwnerPage() {
  return <OwnerApp />;
}

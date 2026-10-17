import { settle, usualRepayDays, type CustomerLedger } from "@/lib/rotation/credit";
import { addDays, shopDate } from "@/lib/time";

// Measurable value (spec 9.15, 11a): credit that came back from customers who were already late,
// in the last 30 days. Paid by link is verified; paid at the counter is the owner's word.

export const RECOVERY_WINDOW_DAYS = 30;

/**
 * A settlement counts when it took longer than the customer's usual days as they stood before it,
 * from at least two earlier settlements.
 */
export function lateCreditRecovered(customers: CustomerLedger[], today: string) {
  const from = addDays(today, -RECOVERY_WINDOW_DAYS);
  let verifiedPaise = 0;
  let declaredPaise = 0;
  for (const customer of customers) {
    const { settled } = settle(customer.entries);
    settled.forEach((settlement, index) => {
      const usual = usualRepayDays(settled.slice(0, index));
      const date = shopDate(settlement.repaidAt);
      if (usual === null || settlement.days <= usual || date < from || date > today) return;
      if (settlement.viaLink) verifiedPaise += settlement.creditPaise;
      else declaredPaise += settlement.creditPaise;
    });
  }
  return { verifiedPaise, declaredPaise };
}

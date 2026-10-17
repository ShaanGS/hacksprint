import type { BillLimitFacts } from "@/lib/planner/facts";

// What the bill-pay rules decide for this week's bills, for the planner's check_bill_limit tool.
// Wired to lib/bill-pay once the mandate code lands; until then the planner sees no limit.
export async function billLimitFacts(): Promise<BillLimitFacts | null> {
  return null;
}

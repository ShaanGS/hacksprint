import type { SourceLabel } from "@/lib/rotation/labels";

// Money cycle days (spec 9.12): how long the shop's money takes to come back. Stock days plus
// customer days minus supplier days, over the last 28 days, and what one day shorter is worth.

export const CYCLE_WINDOW_DAYS = 28;

export type CycleInput = {
  onShelfPaise: number;
  withCustomersPaise: number;
  owedToSuppliersPaise: number;
  /** Bills confirmed in the last 28 days, at cost. */
  purchasesPaise: number;
  dailySalesPaise: number;
};

/** Null when there were no purchases or no sales to divide by. */
export function moneyCycleDays(input: CycleInput) {
  const dailyPurchases = input.purchasesPaise / CYCLE_WINDOW_DAYS;
  if (dailyPurchases <= 0 || input.dailySalesPaise <= 0) return null;
  const stockDays = input.onShelfPaise / dailyPurchases;
  const customerDays = input.withCustomersPaise / input.dailySalesPaise;
  const supplierDays = input.owedToSuppliersPaise / dailyPurchases;
  return {
    days: stockDays + customerDays - supplierDays,
    stockDays,
    customerDays,
    supplierDays,
    /** Every day shorter frees about this much (spec 9.12). */
    freedPerDayPaise: Math.round(dailyPurchases),
    label: "estimate" as SourceLabel,
  };
}

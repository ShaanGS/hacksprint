// Totals are calculated here and ONLY here (guardrail 2, spec section 8).
// All money values are strictly integer paise. No floating-point money is permitted.

export type PricedLine = {
  qty: number;
  unitPricePaise: number;
};

/**
 * Calculates the total in paise for a single order line.
 * For loose items (sold by kg or litre), fractional quantities round to the nearest integer paisa.
 */
export function lineTotalPaise(line: PricedLine): number {
  if (line.qty < 0) {
    throw new Error(`Quantity cannot be negative, got ${line.qty}`);
  }
  if (line.unitPricePaise < 0) {
    throw new Error(`Unit price cannot be negative, got ${line.unitPricePaise}`);
  }
  if (!Number.isInteger(line.unitPricePaise)) {
    throw new Error(
      `Unit price must be an integer in paise, got floating-point ${line.unitPricePaise}`,
    );
  }

  return Math.round(line.qty * line.unitPricePaise);
}

/**
 * Calculates the grand total in paise for an array of order lines.
 * Sums the rounded line totals using exact integer addition.
 */
export function orderTotalPaise(lines: PricedLine[]): number {
  return lines.reduce((total, line) => total + lineTotalPaise(line), 0);
}

/** Aliases for consistent naming across callers. */
export const calculateLineTotal = lineTotalPaise;
export const calculateOrderTotal = orderTotalPaise;

// Totals are worked out here and only here (guardrail 2), in integer paise.

export type PricedLine = { qty: number; unitPricePaise: number };

/** Half a kilo at ₹46 a kilo is 2300 paise. Each line rounds to the nearest paisa. */
export function lineTotalPaise(line: PricedLine): number {
  // A bad quantity or price is a bug upstream; stopping here keeps it off the customer's bill.
  if (line.qty < 0) throw new RangeError("Quantity cannot be negative");
  if (!Number.isInteger(line.unitPricePaise)) {
    throw new RangeError("Unit price must be an integer in paise");
  }
  if (line.unitPricePaise < 0) throw new RangeError("Unit price cannot be negative");
  return Math.round(line.qty * line.unitPricePaise);
}

export function orderTotalPaise(lines: PricedLine[]): number {
  return lines.reduce((total, line) => total + lineTotalPaise(line), 0);
}

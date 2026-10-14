// Totals are worked out here and only here (guardrail 2), in integer paise.

export type PricedLine = { qty: number; unitPricePaise: number };

/** Half a kilo at ₹46 a kilo is 2300 paise. Each line rounds to the nearest paisa. */
export function lineTotalPaise(line: PricedLine): number {
  return Math.round(line.qty * line.unitPricePaise);
}

export function orderTotalPaise(lines: PricedLine[]): number {
  return lines.reduce((total, line) => total + lineTotalPaise(line), 0);
}

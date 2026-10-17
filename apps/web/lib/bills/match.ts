import { lineTotalPaise } from "@/lib/orders/totals";
import type { Distributor, ScannedLine } from "@/lib/bills/types";

// The checks a bill gets before the owner sees it. All of them are code: the model only copies
// what is printed.

function letters(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** "SRI BALAJI AGENCIES" at the top of the bill is our "Sri Balaji Agencies". */
export function matchDistributor(printed: string, distributors: Distributor[]): string | null {
  const wanted = letters(printed);
  if (wanted.length < 4) return null;
  const exact = distributors.find((d) => letters(d.name) === wanted);
  if (exact) return exact.id;
  const partial = distributors.filter(
    (d) => wanted.includes(letters(d.name)) || letters(d.name).includes(wanted),
  );
  return partial.length === 1 ? partial[0].id : null;
}

/** ₹254 to ₹274 is a rise of 8%, to the nearest whole percent. */
export function risePercent(oldPaise: number, newPaise: number): number {
  return Math.round(((newPaise - oldPaise) / oldPaise) * 100);
}

/** Rupees as printed, in paise; the model reads "274.00" as 274. */
export function toPaise(rupees: number | null): number | null {
  return rupees === null ? null : Math.round(rupees * 100);
}

/** The line can be confirmed: a product, and a quantity and rate that were read. */
export function lineReady(line: ScannedLine): boolean {
  return line.productId !== null && line.qty !== null && line.unitCostPaise !== null;
}

/** Quantity times rate agrees with the printed amount, to the rupee, or there is no amount. */
export function lineAgrees(line: ScannedLine): boolean {
  if (line.qty === null || line.unitCostPaise === null || line.printedTotalPaise === null) {
    return true;
  }
  const worked = lineTotalPaise({ qty: line.qty, unitPricePaise: line.unitCostPaise });
  return Math.abs(worked - line.printedTotalPaise) <= 100;
}

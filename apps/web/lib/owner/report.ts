import { formatMoney } from "@/lib/money";
import type { DaySummary } from "@/lib/owner/types";

/** "Sugar", "Sugar and Oil", "Sugar, Oil and Salt". */
function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

/**
 * The day in one or two sentences, built from the numbers by code so every amount is exact:
 * "6 orders today. ₹214 collected, ₹90 on account. Sugar and Gold Winner Sunflower Oil are
 * running low."
 */
export function reportSentence(summary: DaySummary, lowNames: string[]): string {
  const orders = summary.orders === 1 ? "1 order today." : `${summary.orders} orders today.`;
  const money = `${formatMoney(summary.collectedPaise)} collected, ${formatMoney(summary.creditPaise)} on account.`;
  if (lowNames.length === 0) return `${orders} ${money} Nothing is running low.`;
  const verb = lowNames.length === 1 ? "is" : "are";
  return `${orders} ${money} ${joinNames(lowNames)} ${verb} running low.`;
}

const wholeRupees = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const rupeesAndPaise = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Formats money for display. Takes integer paise, as stored in the database, so ₹14 is 1400.
 * Whole rupees print without decimals (₹1,240); anything else shows its paise (₹23.50).
 */
export function formatMoney(paise: number): string {
  const format = paise % 100 === 0 ? wholeRupees : rupeesAndPaise;
  const sign = paise < 0 ? "-" : "";
  return `${sign}₹${format.format(Math.abs(paise) / 100)}`;
}

// The payment rail the bill-pay agent can honestly use (decision of Oct 18). A Paytm link collects
// money for the shop and cannot pay a distributor, so the agent hands the owner a UPI deep link
// instead: it opens his own UPI app with the payee and amount filled in, and he pays there with
// his UPI PIN. We never see or move the money (rule 8).

/** The amount as a UPI link carries it: rupees with two decimals, "14000.00", from paise. */
export function upiAmount(paise: number): string {
  return `${Math.floor(paise / 100)}.${String(paise % 100).padStart(2, "0")}`;
}

// UPI apps read the payee address with its @ as written; everything else is percent-encoded.
const encode = (value: string) => encodeURIComponent(value).replace(/%40/g, "@");

/** upi://pay with the payee's UPI id and name, the amount, INR and the bill number as the note. */
export function upiPayUrl(input: {
  upiId: string;
  payee: string;
  amountPaise: number;
  billNumber: string | null;
}): string {
  const params: [string, string][] = [
    ["pa", input.upiId],
    ["pn", input.payee],
    ["am", upiAmount(input.amountPaise)],
    ["cu", "INR"],
    ...(input.billNumber ? [["tn", input.billNumber] as [string, string]] : []),
  ];
  return `upi://pay?${params.map(([key, value]) => `${key}=${encode(value)}`).join("&")}`;
}

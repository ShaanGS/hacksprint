import { matchCustomer } from "@/lib/credit/parse";
import { numbersSaid } from "@/lib/owner-voice/numbers";
import type { Named, ParsedEntry } from "@/lib/owner-voice/types";

// When the model is down or unsure, plain word matching still reads the common phrasings, so the
// owner is never stuck. Money words in four languages decide the kind; numbers come from the
// transcript only.

const repaid = [
  "paid",
  "repaid",
  "returned",
  "கொடுத்தார்",
  "கட்டினார்",
  "திருப்பி",
  "दिया",
  "लौटाया",
  "चुकाया",
  "ಕೊಟ್ಟರು",
  "ವಾಪಸ್",
];
const dayClose = [
  "sales",
  "sold",
  "in hand",
  "விற்பனை",
  "கையில்",
  "கையில",
  "बिक्री",
  "हाथ में",
  "ಮಾರಾಟ",
  "ಕೈಯಲ್ಲಿ",
];
const credit = [
  "credit",
  "account",
  "udhaar",
  "udhar",
  "kanakku",
  "கணக்கு",
  "கணக்கில்",
  "கடன்",
  "उधार",
  "खाता",
  "ಸಾಲ",
  "ಖಾತೆ",
];

function has(text: string, words: string[]): boolean {
  const lower = text.toLowerCase();
  return words.some((word) => lower.includes(word.toLowerCase()));
}

function productIn(text: string, products: Named[]): string | null {
  const lower = text.toLowerCase();
  const found = products.filter((p) =>
    p.name
      .toLowerCase()
      .split(/\s+/)
      .some((w) => w.length >= 4 && lower.includes(w)),
  );
  return found.length === 1 ? found[0].id : null;
}

export function readByWords(
  transcript: string,
  customers: Named[],
  products: Named[],
): ParsedEntry | null {
  const numbers = numbersSaid(transcript);
  const rupees = (n: number | undefined) => (n === undefined ? null : Math.round(n * 100));
  if (has(transcript, dayClose)) {
    return {
      kind: "day_close",
      cashSalesPaise: rupees(numbers[0]),
      moneyInHandPaise: rupees(numbers[1]),
    };
  }
  const customerId = matchCustomer(transcript, customers);
  if (has(transcript, repaid) && numbers.length > 0) {
    return { kind: "credit_repaid_cash", customerId, amountPaise: rupees(numbers.at(-1)) };
  }
  if ((has(transcript, credit) || customerId) && numbers.length > 0) {
    return { kind: "credit_given", customerId, amountPaise: rupees(numbers.at(-1)) };
  }
  const productId = productIn(transcript, products);
  if (productId && numbers.length > 0)
    return { kind: "stock_count", productId, qty: numbers.at(-1) ?? null };
  return null;
}

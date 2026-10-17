import type { Lang } from "@/lib/i18n/languages";
import { textFor } from "@/lib/i18n/text";
import { formatMoney } from "@/lib/money";
import type { ProductUnit } from "@/lib/orders/quantity";

// Sentences that carry amounts are built here from code, never by the model: the read-back
// of the order and its total (spec F3), in the customer's language.

const fractions: Record<string, Record<Lang, string>> = {
  "0.25": { ta: "கால்", hi: "पाव", kn: "ಕಾಲು", en: "a quarter" },
  "0.5": { ta: "அரை", hi: "आधा", kn: "ಅರ್ಧ", en: "half a" },
  "0.75": { ta: "முக்கால்", hi: "पौना", kn: "ಮುಕ್ಕಾಲು", en: "three quarters of a" },
};

const unitWords: Record<"kg" | "litre", Record<Lang, string>> = {
  kg: { ta: "கிலோ", hi: "किलो", kn: "ಕೆಜಿ", en: "kilo" },
  litre: { ta: "லிட்டர்", hi: "लीटर", kn: "ಲೀಟರ್", en: "litre" },
};

const rupeeWords: Record<Lang, string> = {
  ta: "ரூபாய்",
  hi: "रुपये",
  kn: "ರೂಪಾಯಿ",
  en: "rupees",
};

/** "2" for packs and pieces; "அரை கிலோ" (half a kilo) for loose goods. */
export function quantityPhrase(qty: number, unit: ProductUnit, lang: Lang): string {
  if (unit === "pack" || unit === "piece") return String(qty);
  const fraction = fractions[String(qty)];
  return `${fraction ? fraction[lang] : qty} ${unitWords[unit][lang]}`;
}

export type ReadBackLine = { name: string; qty: number; unit: ProductUnit };

/** "2 Maggi Masala Noodles, அரை கிலோ Jaggery. மொத்தம் ₹121." */
export function readBack(lines: ReadBackLine[], totalPaise: number, lang: Lang): string {
  const items = lines.map((line) => `${quantityPhrase(line.qty, line.unit, lang)} ${line.name}`);
  return textFor(lang).readBack(items.join(", "), formatMoney(totalPaise));
}

/** What the speech engine should read: "₹1,240" becomes "1240 rupees" in the right language. */
export function forSpeech(text: string, lang: Lang): string {
  return text
    .replace(
      /₹([\d,]+(?:\.\d{2})?)/g,
      (_, amount: string) => `${amount.replace(/,/g, "")} ${rupeeWords[lang]}`,
    )
    .replace(/#(\d+)/g, "$1");
}

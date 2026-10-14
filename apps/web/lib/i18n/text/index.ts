import type { Lang } from "@/lib/i18n/languages";
import { en, type CustomerText } from "@/lib/i18n/text/en";
import { hi } from "@/lib/i18n/text/hi";
import { kn } from "@/lib/i18n/text/kn";
import { ta } from "@/lib/i18n/text/ta";

const texts: Record<Lang, CustomerText> = { ta, hi, kn, en };

/** Every customer-facing line in the customer's language. */
export function textFor(lang: Lang): CustomerText {
  return texts[lang];
}

export type { CustomerText };

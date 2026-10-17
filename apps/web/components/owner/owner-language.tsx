"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { Lang } from "@/lib/i18n/languages";
import { moneyTextFor, type MoneyText } from "@/lib/i18n/money";
import { ownerTextFor, type OwnerText } from "@/lib/i18n/owner";

// The owner's language for every owner screen, set from the shop. A switch to English lets
// someone else read along; it lasts while the page is open.

type OwnerWords = OwnerText & MoneyText;

type OwnerLanguageValue = {
  lang: Lang;
  /** The shop's own language, which the switch goes back to. */
  shopLang: Lang;
  text: OwnerWords;
  setLang: (lang: Lang) => void;
};

const wordsFor = (lang: Lang): OwnerWords => ({ ...ownerTextFor(lang), ...moneyTextFor(lang) });

const OwnerLanguageContext = createContext<OwnerLanguageValue>({
  lang: "en",
  shopLang: "en",
  text: wordsFor("en"),
  setLang: () => undefined,
});

export function OwnerLanguage({ lang: shopLang, children }: { lang: Lang; children: ReactNode }) {
  const [lang, setLang] = useState(shopLang);
  const value = useMemo(
    () => ({ lang, shopLang, text: wordsFor(lang), setLang }),
    [lang, shopLang],
  );
  return <OwnerLanguageContext value={value}>{children}</OwnerLanguageContext>;
}

/** The owner's language and the app's words in it. */
export function useOwnerLanguage(): OwnerLanguageValue {
  return useContext(OwnerLanguageContext);
}

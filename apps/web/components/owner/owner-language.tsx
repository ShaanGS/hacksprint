"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { isLang, type Lang } from "@/lib/i18n/languages";
import { moneyTextFor, type MoneyText } from "@/lib/i18n/money";
import { ownerTextFor, type OwnerText } from "@/lib/i18n/owner";

// The owner's language for every owner screen, set from the shop. The switch to English lets
// someone else read along, and this phone remembers it.

const KEY = "owner-lang";

type OwnerWords = OwnerText & MoneyText;

type OwnerLanguageValue = {
  lang: Lang;
  /** The shop's own language, which the switch goes back to. */
  shopLang: Lang;
  text: OwnerWords;
  setLang: (lang: Lang) => void;
};

const wordsFor = (lang: Lang): OwnerWords => ({ ...ownerTextFor(lang), ...moneyTextFor(lang) });

function remembered(): Lang | null {
  try {
    const value = localStorage.getItem(KEY);
    return isLang(value) ? value : null;
  } catch {
    return null;
  }
}

function listen(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

const OwnerLanguageContext = createContext<OwnerLanguageValue>({
  lang: "en",
  shopLang: "en",
  text: wordsFor("en"),
  setLang: () => undefined,
});

export function OwnerLanguage({ lang: shopLang, children }: { lang: Lang; children: ReactNode }) {
  const stored = useSyncExternalStore(listen, remembered, () => null);
  const [chosen, setChosen] = useState<Lang | null>(null);
  const lang = chosen ?? stored ?? shopLang;
  const value = useMemo(
    () => ({
      lang,
      shopLang,
      text: wordsFor(lang),
      setLang: (next: Lang) => {
        setChosen(next);
        try {
          localStorage.setItem(KEY, next);
        } catch {
          // Without storage the choice lasts while the page is open.
        }
      },
    }),
    [lang, shopLang],
  );
  return <OwnerLanguageContext value={value}>{children}</OwnerLanguageContext>;
}

/** The owner's language and the app's words in it. */
export function useOwnerLanguage(): OwnerLanguageValue {
  return useContext(OwnerLanguageContext);
}

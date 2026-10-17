"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Lang } from "@/lib/i18n/languages";
import { ownerTextFor, type OwnerText } from "@/lib/i18n/owner";

// The owner's language for every owner screen, set once from the shop (spec A2).

type OwnerLanguageValue = { lang: Lang; text: OwnerText };

const OwnerLanguageContext = createContext<OwnerLanguageValue>({
  lang: "en",
  text: ownerTextFor("en"),
});

export function OwnerLanguage({ lang, children }: { lang: Lang; children: ReactNode }) {
  return (
    <OwnerLanguageContext value={{ lang, text: ownerTextFor(lang) }}>
      {children}
    </OwnerLanguageContext>
  );
}

/** The owner's language and the app's words in it. */
export function useOwnerLanguage(): OwnerLanguageValue {
  return useContext(OwnerLanguageContext);
}

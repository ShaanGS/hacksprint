"use client";

import { useOwnerLanguage } from "@/components/owner/owner-language";
import { langInfo } from "@/lib/i18n/languages";

/**
 * Switches between the shop's language and English, so anyone can read along: a round button
 * showing the language it switches to, as in the reference's top bar.
 */
export function LanguageSwitch() {
  const { lang, shopLang, setLang } = useOwnerLanguage();
  const other = lang === "en" ? shopLang : "en";
  if (other === lang) return null;
  return (
    <button
      type="button"
      onClick={() => setLang(other)}
      aria-label={langInfo[other].name}
      className="grid size-11 shrink-0 place-items-center rounded-full bg-surface text-sm font-bold shadow-card"
    >
      {other === "en" ? "EN" : langInfo[other].name.charAt(0)}
    </button>
  );
}

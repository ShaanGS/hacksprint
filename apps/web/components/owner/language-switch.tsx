"use client";

import { Languages } from "lucide-react";
import { useOwnerLanguage } from "@/components/owner/owner-language";
import { langInfo } from "@/lib/i18n/languages";

/** Switches between the shop's language and English, so anyone can read along. */
export function LanguageSwitch() {
  const { lang, shopLang, setLang } = useOwnerLanguage();
  const other = lang === "en" ? shopLang : "en";
  if (other === lang) return null;
  return (
    <button
      type="button"
      onClick={() => setLang(other)}
      className="flex min-h-11 items-center gap-1.5 rounded-full bg-surface-muted px-3 text-sm font-semibold"
    >
      <Languages aria-hidden className="size-4" />
      {langInfo[other].name}
    </button>
  );
}

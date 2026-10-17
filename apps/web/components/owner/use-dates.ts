import { useOwnerLanguage } from "@/components/owner/owner-language";
import { langInfo } from "@/lib/i18n/languages";

/** Dates and times written the way the reader's language writes them ("17 Oct", "9:30 pm"). */
export function useDates() {
  const { lang } = useOwnerLanguage();
  const locale = langInfo[lang].sarvamCode;
  return {
    day: (iso: string) =>
      new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "short" }),
    weekday: (iso: string) =>
      new Date(iso).toLocaleDateString(locale, {
        weekday: "short",
        day: "numeric",
        month: "short",
      }),
    time: (iso: string) =>
      new Date(iso).toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" }),
    dayAndTime: (iso: string) =>
      new Date(iso).toLocaleString(locale, {
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
      }),
  };
}

export const langs = ["ta", "hi", "kn", "en"] as const;

export type Lang = (typeof langs)[number];

/** How each language is named on screen, and the codes and voice Sarvam uses for it. */
export const langInfo: Record<Lang, { name: string; sarvamCode: string; voice: string }> = {
  ta: { name: "தமிழ்", sarvamCode: "ta-IN", voice: "ishita" },
  hi: { name: "हिन्दी", sarvamCode: "hi-IN", voice: "priya" },
  kn: { name: "ಕನ್ನಡ", sarvamCode: "kn-IN", voice: "kavya" },
  en: { name: "English", sarvamCode: "en-IN", voice: "ishita" },
};

export function isLang(value: unknown): value is Lang {
  return typeof value === "string" && (langs as readonly string[]).includes(value);
}

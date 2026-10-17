// What the owner said, as a decision (guardrail 3). Plain word matching, not a model: three
// outcomes, a handful of words each, and it must never guess wrong on a money decision.
// "Put it on account" is checked first and "no" before "yes", so "venda, kanakku" never approves.

export type Decision = "approve" | "reject" | "credit";

const words: Record<Decision, string[]> = {
  credit: [
    "kanakku",
    "kanakkil",
    "kanakula",
    "கணக்கு",
    "கணக்கில்",
    "கணக்குல",
    "account",
    "udhaar",
    "udhar",
    "उधार",
    "khata",
    "खाता",
    "ಖಾತೆ",
    "credit",
  ],
  reject: [
    "venda",
    "வேண்டாம்",
    "vendam",
    "no",
    "nahi",
    "नहीं",
    "nahin",
    "reject",
    "beda",
    "ಬೇಡ",
    "cancel",
  ],
  approve: [
    "seri",
    "sari",
    "சரி",
    "ok",
    "okay",
    "haan",
    "हाँ",
    "हां",
    "han",
    "yes",
    "approve",
    "howdu",
    "ಹೌದು",
    "sare",
    "accept",
    "தாங்க",
  ],
};

const order: Decision[] = ["credit", "reject", "approve"];

/** The owner's decision in what they said, or null if they said none of the words. */
export function parseApproval(text: string): Decision | null {
  const spoken = text.toLowerCase().normalize("NFC");
  const tokens = spoken.split(/[\s,.!?।]+/).filter(Boolean);
  for (const decision of order) {
    if (
      words[decision].some(
        (word) => tokens.includes(word) || (word.length > 3 && spoken.includes(word)),
      )
    ) {
      return decision;
    }
  }
  return null;
}

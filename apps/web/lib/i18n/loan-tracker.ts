import type { Lang } from "@/lib/i18n/languages";
import type { LoanStatus } from "@/lib/loans/track";

// The loan tracker's words, in Tamil and English. Amounts and dates arrive already written;
// every number comes from code or from what the owner said.

type Money = string;

export type LoanTrackerWords = {
  title: string;
  startTracking: string;
  tracking: string;
  steps: Record<LoanStatus, string>;
  tap: Record<LoanStatus, string>;
  stepOn: (date: string) => string;
  rejectedLine: string;
  sanctionTitle: string;
  sanctionedAmount: string;
  emiAmount: string;
  months: string;
  monthsOption: (months: number) => string;
  save: string;
  emisPaid: (paid: number, total: number) => string;
  nextEmi: (amount: Money, date: string) => string;
  overdue: (days: number) => string;
  kept: (kept: Money, emi: Money) => string;
  tonight: (amount: Money) => string;
  tonightHint: string;
  keptIt: string;
  allKept: string;
  startsLater: (days: number) => string;
  allPaid: string;
  ownWord: string;
};

const en: LoanTrackerWords = {
  title: "Your loan",
  startTracking: "I applied at the bank",
  tracking: "We will track this loan. Tap each step when the bank tells you.",
  steps: {
    applied: "Applied",
    docs_asked: "Bank asked for documents",
    sanctioned: "Sanctioned",
    disbursed: "Money in your account",
    rejected: "Turned down",
  },
  tap: {
    applied: "Applied",
    docs_asked: "Bank asked for documents",
    sanctioned: "Bank sanctioned it",
    disbursed: "Money came in",
    rejected: "Bank said no",
  },
  stepOn: (date) => `on ${date}`,
  rejectedLine:
    "Ask the bank why. You can apply at another bank or on JanSamarth; applying costs nothing.",
  sanctionTitle: "What did the bank give?",
  sanctionedAmount: "Loan amount (₹)",
  emiAmount: "EMI each month (₹)",
  months: "For how many months?",
  monthsOption: (months) => `${months} months`,
  save: "Save",
  emisPaid: (paid, total) => `${paid} of ${total} EMIs paid`,
  nextEmi: (amount, date) => `Next EMI ${amount} on ${date}`,
  overdue: (days) => `${days} ${days === 1 ? "day" : "days"} late`,
  kept: (kept, emi) => `Kept aside ${kept} of ${emi}`,
  tonight: (amount) => `Keep ${amount} aside tonight`,
  tonightHint: "In your own bank account. Sized to today's sales, so the EMI is ready on time.",
  keptIt: "I kept it aside",
  allKept: "The EMI is all kept aside. Pay it from the dues list when it falls due.",
  startsLater: (days) => `Setting aside starts ${days} days before the EMI.`,
  allPaid: "Every EMI is paid. The loan is done.",
  ownWord: "Your word",
};

const ta: LoanTrackerWords = {
  title: "உங்கள் கடன்",
  startTracking: "வங்கியில் விண்ணப்பித்தேன்",
  tracking: "இந்தக் கடனைக் கண்காணிப்போம். வங்கி சொல்லும்போது ஒவ்வொரு படியையும் தொடுங்கள்.",
  steps: {
    applied: "விண்ணப்பித்தது",
    docs_asked: "வங்கி ஆவணங்கள் கேட்டது",
    sanctioned: "அனுமதிக்கப்பட்டது",
    disbursed: "பணம் கணக்கில் வந்தது",
    rejected: "மறுக்கப்பட்டது",
  },
  tap: {
    applied: "விண்ணப்பித்தேன்",
    docs_asked: "வங்கி ஆவணங்கள் கேட்டது",
    sanctioned: "வங்கி அனுமதித்தது",
    disbursed: "பணம் வந்தது",
    rejected: "வங்கி மறுத்தது",
  },
  stepOn: (date) => `${date} அன்று`,
  rejectedLine:
    "ஏன் என்று வங்கியிடம் கேளுங்கள். வேறு வங்கியிலோ JanSamarth-இலோ விண்ணப்பிக்கலாம்; கட்டணம் இல்லை.",
  sanctionTitle: "வங்கி என்ன கொடுத்தது?",
  sanctionedAmount: "கடன் தொகை (₹)",
  emiAmount: "மாத EMI (₹)",
  months: "எத்தனை மாதங்கள்?",
  monthsOption: (months) => `${months} மாதங்கள்`,
  save: "சேமி",
  emisPaid: (paid, total) => `${total} EMI-களில் ${paid} கட்டியாகிவிட்டது`,
  nextEmi: (amount, date) => `அடுத்த EMI ${amount}, ${date} அன்று`,
  overdue: (days) => `${days} நாள் தாமதம்`,
  kept: (kept, emi) => `${emi}-இல் ${kept} எடுத்து வைத்தது`,
  tonight: (amount) => `இன்றிரவு ${amount} எடுத்து வையுங்கள்`,
  tonightHint: "உங்கள் சொந்த வங்கிக் கணக்கில். இன்றைய விற்பனைக்கு ஏற்ற அளவு, EMI நேரத்தில் தயார்.",
  keptIt: "எடுத்து வைத்தேன்",
  allKept:
    "EMI முழுதும் எடுத்து வைத்தாகிவிட்டது. கெடு நாளில் கட்ட வேண்டியவை பட்டியலில் கட்டுங்கள்.",
  startsLater: (days) => `EMI-க்கு ${days} நாள் முன்பு எடுத்து வைப்பது தொடங்கும்.`,
  allPaid: "எல்லா EMI-யும் கட்டியாகிவிட்டது. கடன் முடிந்தது.",
  ownWord: "நீங்கள் சொன்னது",
};

/** The tracker's words in the owner's language; English where we have no translation yet. */
export function loanTrackerWordsFor(lang: Lang): LoanTrackerWords {
  return lang === "ta" ? ta : en;
}

import type { Lang } from "@/lib/i18n/languages";
import type { BillDecision } from "@/lib/rotation/mandate";

// The bill-pay agent's words and its limit card (decision of Oct 18), in Tamil and English.
// Amounts arrive already formatted; every number comes from code.

type Money = string;

/** What a reason may need to say why a bill is paid or held. */
export type ReasonFacts = {
  reason: BillDecision["reason"];
  keep: Money;
  needsMore: Money;
  dueInDays: number;
  festival: string | null;
};

export type BillPayWords = {
  title: string;
  steps: { due: string; limit: string; inHand: string; decided: string };
  billsMeta: (count: number, total: Money) => string;
  noBills: string;
  limitMeta: (limit: Money, left: Money, paying: boolean) => string;
  noLimit: string;
  inHandMeta: (inHand: Money, keep: Money) => string;
  decidedMeta: (pay: number, hold: number, after: Money) => string;
  badge: { pay: string; hold: string; paid: string };
  reason: (facts: ReasonFacts) => string;
  payWithUpi: (amount: Money) => string;
  iPaid: string;
  afterPaying: string;
  paidLine: (amount: Money) => string;
  ownApp: string;
  setLimitFirst: string;
  setLimit: string;
  noLonger: string;
  paidThisWeek: string;
  standInTitle: string;
  standInLine: string;
  fields: { payee: string; upiId: string; amount: string; bill: string };
  cardTitle: string;
  cardText: string;
  weeklyLabel: string;
  keepLabel: string;
  current: (limit: Money, keep: Money) => string;
  notSet: string;
  save: string;
  stop: string;
  saved: string;
  stopped: string;
};

const en: BillPayWords = {
  title: "Paying bills for you",
  steps: {
    due: "Bills due",
    limit: "Your limit",
    inHand: "Money in hand",
    decided: "Decided each bill",
  },
  billsMeta: (count, total) => `${count} ${count === 1 ? "bill" : "bills"}, ${total}`,
  noBills: "No bills to pay.",
  limitMeta: (limit, left, paying) =>
    paying ? `${limit} a week, ${left} left after these` : `${limit} a week, ${left} left`,
  noLimit: "Not set yet",
  inHandMeta: (inHand, keep) => `${inHand} now, keep ${keep}`,
  decidedMeta: (pay, hold, after) =>
    pay > 0
      ? `${pay} to pay, ${hold} on hold. ${after} stays in hand`
      : `Nothing to pay now, ${hold} on hold`,
  badge: { pay: "Pay", hold: "Hold", paid: "Paid" },
  reason: (facts) => {
    switch (facts.reason) {
      case "within_limit":
        return `Inside your limit, with ${facts.keep} still in hand`;
      case "over_limit":
        return "More than your weekly limit has left";
      case "not_enough_in_hand":
        return `Needs ${facts.needsMore} more in hand to keep your ${facts.keep}`;
      case "no_upi_id":
        return "No UPI id for this distributor yet";
      case "not_due_yet":
        return `Due in ${facts.dueInDays} ${facts.dueInDays === 1 ? "day" : "days"}`;
      case "festival_order":
        return `This is the ${facts.festival ?? "festival"} order: the loan is for it`;
      case "no_mandate":
        return "Set your weekly limit first";
    }
  },
  payWithUpi: (amount) => `Pay ${amount} with UPI`,
  iPaid: "I paid it",
  afterPaying: "Paid in your UPI app? Tap I paid it.",
  paidLine: (amount) => `${amount} paid by UPI`,
  ownApp: "You pay from your own UPI app with your PIN. The agent never touches the money.",
  setLimitFirst: "Set a weekly limit first. The agent pays only inside it.",
  setLimit: "Set the limit in the Bank tab",
  noLonger: "This bill can no longer be paid inside your limit. Look again.",
  paidThisWeek: "Paid inside your limit this week",
  standInTitle: "Your UPI app",
  standInLine: "Your UPI app opens here with these details. Demo: no money moves.",
  fields: { payee: "Pay to", upiId: "UPI id", amount: "Amount", bill: "Bill" },
  cardTitle: "Bills the agent may pay",
  cardText:
    "Pick a weekly limit and the money that always stays in hand. The agent pays only inside them, from your own UPI app.",
  weeklyLabel: "In any 7 days, up to",
  keepLabel: "Always keep in hand",
  current: (limit, keep) => `Now: ${limit} a week, keep ${keep}`,
  notSet: "No limit yet, so the agent pays nothing.",
  save: "Save the limit",
  stop: "Stop",
  saved: "Limit saved",
  stopped: "Stopped. The agent pays no bills now.",
};

const ta: BillPayWords = {
  title: "உங்களுக்காக பில் கட்டுகிறது",
  steps: {
    due: "கட்ட வேண்டிய பில்கள்",
    limit: "உங்கள் வரம்பு",
    inHand: "கையிருப்பு",
    decided: "ஒவ்வொரு பில்லுக்கும் முடிவு",
  },
  billsMeta: (count, total) => `${count} பில்கள், ${total}`,
  noBills: "கட்ட வேண்டிய பில் இல்லை.",
  limitMeta: (limit, left, paying) =>
    paying
      ? `வாரத்துக்கு ${limit}, இவற்றைக் கட்டிய பின் ${left} மீதி`
      : `வாரத்துக்கு ${limit}, ${left} மீதி`,
  noLimit: "இன்னும் அமைக்கவில்லை",
  inHandMeta: (inHand, keep) => `இப்போது ${inHand}, எப்போதும் ${keep} கையில்`,
  decidedMeta: (pay, hold, after) =>
    pay > 0
      ? `${pay} கட்டலாம், ${hold} காத்திருக்கும். கையில் ${after} இருக்கும்`
      : `இப்போது கட்ட எதுவும் இல்லை, ${hold} காத்திருக்கும்`,
  badge: { pay: "கட்டலாம்", hold: "காத்திரு", paid: "கட்டியது" },
  reason: (facts) => {
    switch (facts.reason) {
      case "within_limit":
        return `உங்கள் வரம்புக்குள், கையில் ${facts.keep} இருக்கும்`;
      case "over_limit":
        return "உங்கள் வார வரம்பில் மீதியுள்ளதை விட அதிகம்";
      case "not_enough_in_hand":
        return `கையில் ${facts.keep} இருக்க, இன்னும் ${facts.needsMore} வேண்டும்`;
      case "no_upi_id":
        return "இந்த விநியோகஸ்தரின் UPI ஐடி இன்னும் இல்லை";
      case "not_due_yet":
        return `${facts.dueInDays} நாளில் கெடு`;
      case "festival_order":
        return `இது ${facts.festival ?? "பண்டிகை"} ஆர்டர்: கடன் இதற்குத்தான்`;
      case "no_mandate":
        return "முதலில் வார வரம்பை அமையுங்கள்";
    }
  },
  payWithUpi: (amount) => `UPI-ல் ${amount} கட்டு`,
  iPaid: "கட்டிவிட்டேன்",
  afterPaying: "UPI ஆப்பில் கட்டிவிட்டீர்களா? கட்டிவிட்டேன் என்பதைத் தொடுங்கள்.",
  paidLine: (amount) => `UPI-ல் ${amount} கட்டியது`,
  ownApp:
    "உங்கள் சொந்த UPI ஆப்பில், உங்கள் PIN-உடன் நீங்களே கட்டுகிறீர்கள். முகவர் பணத்தைத் தொடாது.",
  setLimitFirst: "முதலில் வார வரம்பை அமையுங்கள். அதற்குள் மட்டுமே முகவர் கட்டும்.",
  setLimit: "வங்கி பக்கத்தில் வரம்பை அமையுங்கள்",
  noLonger: "இந்த பில் இப்போது உங்கள் வரம்புக்குள் இல்லை. மீண்டும் பாருங்கள்.",
  paidThisWeek: "இந்த வாரம் வரம்புக்குள் கட்டியவை",
  standInTitle: "உங்கள் UPI ஆப்",
  standInLine: "இந்த விவரங்களுடன் உங்கள் UPI ஆப் இங்கே திறக்கும். டெமோ: பணம் எதுவும் போகாது.",
  fields: { payee: "யாருக்கு", upiId: "UPI ஐடி", amount: "தொகை", bill: "பில்" },
  cardTitle: "முகவர் கட்டக்கூடிய பில்கள்",
  cardText:
    "வார வரம்பையும், எப்போதும் கையில் இருக்க வேண்டிய பணத்தையும் தேர்ந்தெடுங்கள். அதற்குள் மட்டுமே, உங்கள் சொந்த UPI ஆப்பில் இருந்து முகவர் கட்டும்.",
  weeklyLabel: "எந்த 7 நாளிலும், அதிகபட்சம்",
  keepLabel: "எப்போதும் கையில் இருக்க",
  current: (limit, keep) => `இப்போது: வாரத்துக்கு ${limit}, கையில் ${keep}`,
  notSet: "இன்னும் வரம்பு இல்லை, அதனால் முகவர் எதுவும் கட்டாது.",
  save: "வரம்பைச் சேமி",
  stop: "நிறுத்து",
  saved: "வரம்பு சேமிக்கப்பட்டது",
  stopped: "நிறுத்தியது. முகவர் இனி எந்த பில்லும் கட்டாது.",
};

/** The bill-pay agent's words in the owner's language; English where we have no translation yet. */
export function billPayWordsFor(lang: Lang): BillPayWords {
  return lang === "ta" ? ta : en;
}

import type { Lang } from "@/lib/i18n/languages";
import type { PlanReason } from "@/lib/planner/plan";
import type { PlanAction } from "@/lib/rotation/plan-effects";

// The planner agent's words, in Tamil and English. Amounts arrive already formatted and names
// come from the shop's own records; the model supplies neither.

type Money = string;
type Target = "collect" | "pay" | "reorder" | "bank";

export type PlannerWords = {
  letAgentPlan: string;
  planHint: string;
  title: string;
  rail: Record<string, string>;
  railMeta: {
    late: (count: number) => string;
    bills: (count: number) => string;
    stock: (low: number, orders: number) => string;
    loan: (amount: Money | null) => string;
    limit: (set: boolean, pay: number, hold: number) => string;
  };
  ordering: string;
  step: Record<PlanAction, (names: string[]) => string>;
  amount: Record<PlanAction, (amount: Money) => string>;
  reason: Record<PlanReason, string>;
  shortAfter: (amount: Money) => string;
  spareAfter: (amount: Money) => string;
  inHandAfter: (amount: Money) => string;
  open: Record<Target, string>;
  byModel: string;
  byRules: string;
  usage: (calls: number, tokens: string) => string;
  record: string;
  nothingToDo: string;
  failed: string;
};

const list = (names: string[], and: string) =>
  names.length <= 1 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} ${and} ${names.at(-1)}`;

const en: PlannerWords = {
  letAgentPlan: "Let the agent plan this week",
  planHint:
    "It reads your bills, late payers and stock, then puts the steps in order. You decide each one.",
  title: "Planning your week",
  rail: {
    summary: "Read this week",
    look_at_week: "Looked at money needed and likely",
    list_late_payers: "Looked at late payers",
    list_bills_due: "Looked at bills due",
    check_stock: "Checked the shelf",
    check_loan: "Checked the festival order and the loan",
    check_bill_limit: "Checked your bill limit",
  },
  railMeta: {
    late: (count) => `${count} late ${count === 1 ? "payer" : "payers"}`,
    bills: (count) => `${count} ${count === 1 ? "bill" : "bills"} this week`,
    stock: (low, orders) => `${low} running out · ${orders} to reorder`,
    loan: (amount) => (amount ? `A loan of ${amount}` : "No loan needed"),
    limit: (set, pay, hold) => (set ? `${pay} to pay, ${hold} to hold` : "No limit set yet"),
  },
  ordering: "Put the steps in order",
  step: {
    collect: (names) => `Collect from ${list(names, "and")}`,
    pay_bills: (names) => `Pay ${list(names, "and")} inside your limit`,
    reorder: (names) => `Reorder from ${list(names, "and")}`,
    move_festival_order: (names) =>
      `Ask ${names[0] ?? "the distributor"} to bill the festival order next week`,
    check_loan: () => "Check a Mudra loan for the festival order",
  },
  amount: {
    collect: (amount) => `+${amount} if they pay`,
    pay_bills: (amount) => `${amount} from money in hand`,
    reorder: (amount) => `${amount} on the distributor's credit`,
    move_festival_order: (amount) => `${amount} out of this week`,
    check_loan: (amount) => `About ${amount}`,
  },
  reason: {
    late_payers_first: "Collect what is owed before anything that costs money.",
    within_your_limit: "Inside the limit you set.",
    bill_due_soon: "Due soon.",
    runs_out_soon: "Runs out within a week.",
    festival_needs_money: "The festival order needs money this week.",
    cheaper_than_app_loans: "A Mudra loan from a bank costs far less than an app loan.",
    close_the_gap: "Closes this week's gap.",
  },
  shortAfter: (amount) => `Short after this: ${amount}`,
  spareAfter: (amount) => `Spare after this: ${amount}`,
  inHandAfter: (amount) => `In hand after this: ${amount}`,
  open: {
    collect: "Open the collection agent",
    pay: "Open the bill-pay agent",
    reorder: "Open the reorder agent",
    bank: "Open the loan check",
  },
  byModel: "Planned by Gemini from your numbers. The app works out every amount.",
  byRules: "Planned by fixed rules: the AI could not answer just now.",
  usage: (calls, tokens) =>
    `${calls} model ${calls === 1 ? "call" : "calls"}, ${tokens} tokens of context in all.`,
  record: "See how it decided",
  nothingToDo: "This week is fine. There is nothing to do now.",
  failed: "Could not plan just now. Try again.",
};

const ta: PlannerWords = {
  letAgentPlan: "இந்த வாரத்தை முகவர் திட்டமிடட்டும்",
  planHint:
    "பில்கள், தாமதமாகக் கட்டுபவர்கள், சரக்கு எல்லாம் பார்த்து வரிசைப்படுத்தும். ஒவ்வொன்றையும் நீங்களே முடிவு செய்யுங்கள்.",
  title: "உங்கள் வாரத்தைத் திட்டமிடுகிறேன்",
  rail: {
    summary: "இந்த வாரத்தைப் படித்தேன்",
    look_at_week: "தேவை, வரவு பார்த்தேன்",
    list_late_payers: "தாமதமாகக் கட்டுபவர்களைப் பார்த்தேன்",
    list_bills_due: "கட்ட வேண்டிய பில்களைப் பார்த்தேன்",
    check_stock: "சரக்கைப் பார்த்தேன்",
    check_loan: "பண்டிகை ஆர்டரையும் கடனையும் பார்த்தேன்",
    check_bill_limit: "உங்கள் பில் வரம்பைப் பார்த்தேன்",
  },
  railMeta: {
    late: (count) => `${count} பேர் தாமதம்`,
    bills: (count) => `இந்த வாரம் ${count} பில்`,
    stock: (low, orders) => `${low} தீர்கிறது · ${orders} ஆர்டர்`,
    loan: (amount) => (amount ? `${amount} கடன்` : "கடன் தேவையில்லை"),
    limit: (set, pay, hold) =>
      set ? `${pay} கட்டலாம், ${hold} நிறுத்தி வை` : "வரம்பு இன்னும் இல்லை",
  },
  ordering: "வரிசைப்படுத்தினேன்",
  step: {
    collect: (names) => `${list(names, "மற்றும்")}-இடம் வசூல் செய்யுங்கள்`,
    pay_bills: (names) => `${list(names, "மற்றும்")}-க்கு உங்கள் வரம்புக்குள் கட்டுங்கள்`,
    reorder: (names) => `${list(names, "மற்றும்")}-இடம் மீண்டும் ஆர்டர் செய்யுங்கள்`,
    move_festival_order: (names) =>
      `பண்டிகை ஆர்டருக்கு அடுத்த வாரம் பில் போடச் சொல்லுங்கள் (${names[0] ?? ""})`,
    check_loan: () => "பண்டிகை ஆர்டருக்கு முத்ரா கடனைப் பாருங்கள்",
  },
  amount: {
    collect: (amount) => `அவர்கள் கட்டினால் +${amount}`,
    pay_bills: (amount) => `கையிருப்பிலிருந்து ${amount}`,
    reorder: (amount) => `விநியோகஸ்தர் கடனில் ${amount}`,
    move_festival_order: (amount) => `இந்த வாரத்திலிருந்து ${amount} குறையும்`,
    check_loan: (amount) => `சுமார் ${amount}`,
  },
  reason: {
    late_payers_first: "செலவாகும் எதற்கும் முன், வர வேண்டியதை வசூல் செய்யுங்கள்.",
    within_your_limit: "நீங்கள் வைத்த வரம்புக்குள்.",
    bill_due_soon: "கெடு நெருங்குகிறது.",
    runs_out_soon: "ஒரு வாரத்துக்குள் தீர்ந்துவிடும்.",
    festival_needs_money: "பண்டிகை ஆர்டருக்கு இந்த வாரம் பணம் தேவை.",
    cheaper_than_app_loans: "வங்கியின் முத்ரா கடன், செயலி கடனை விட மிகக் குறைந்த செலவு.",
    close_the_gap: "இந்த வாரப் பற்றாக்குறையை மூடும்.",
  },
  shortAfter: (amount) => `இதற்குப் பிறகு பற்றாக்குறை: ${amount}`,
  spareAfter: (amount) => `இதற்குப் பிறகு மீதம்: ${amount}`,
  inHandAfter: (amount) => `இதற்குப் பிறகு கையில்: ${amount}`,
  open: {
    collect: "வசூல் முகவரைத் திற",
    pay: "பில் கட்டும் முகவரைத் திற",
    reorder: "ஆர்டர் முகவரைத் திற",
    bank: "கடன் பார்வையைத் திற",
  },
  byModel: "உங்கள் எண்களிலிருந்து Gemini திட்டமிட்டது. ஒவ்வொரு தொகையையும் செயலியே கணக்கிடுகிறது.",
  byRules: "நிலையான விதிகளால் திட்டமிடப்பட்டது: AI இப்போது பதில் தரவில்லை.",
  usage: (calls, tokens) => `${calls} முறை AI-யிடம் கேட்டது, மொத்தம் ${tokens} டோக்கன்கள்.`,
  record: "எப்படி முடிவு செய்தது என்று பாருங்கள்",
  nothingToDo: "இந்த வாரம் சரியாக உள்ளது. இப்போது செய்ய எதுவும் இல்லை.",
  failed: "இப்போது திட்டமிட முடியவில்லை. மீண்டும் முயற்சிக்கவும்.",
};

export function plannerWordsFor(lang: Lang): PlannerWords {
  return lang === "ta" ? ta : en;
}

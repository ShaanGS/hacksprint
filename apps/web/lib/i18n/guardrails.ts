import type { Lang } from "@/lib/i18n/languages";
import type { DropReason, FixReason } from "@/lib/planner/guardrails";

// The words for the planner's guardrails, in Tamil and English: the rail row, what was stopped
// and why, and what code fixed. Amounts in held bills come from code (bill-pay words).

export type GuardrailWords = {
  checked: string;
  railMeta: (rules: number, blocked: number, fixed: number) => string;
  stoppedTitle: string;
  why: Record<DropReason, string>;
  fix: Record<FixReason, (count: number) => string>;
  privacy: string;
  byRulesBlocked: string;
};

const en: GuardrailWords = {
  checked: "Checked against your rules",
  railMeta: (rules, blocked, fixed) =>
    blocked > 0
      ? `${rules} rules: ${blocked} ${blocked === 1 ? "step" : "steps"} stopped`
      : fixed > 0
        ? `${rules} rules: passed after a fix`
        : `${rules} rules: all passed`,
  stoppedTitle: "Stopped by your rules",
  why: {
    off_schema: "The AI's plan used a step that is not allowed, so it was not used.",
    repeated: "The same step twice.",
    unknown_customer: "Collecting from someone who is not a late payer.",
    unknown_bill: "Paying a bill your limit did not offer.",
    unknown_distributor: "Reordering from a distributor with nothing running out.",
    festival_not_checked: "Moving the festival order without looking at it first.",
    loan_not_checked: "A loan the agent never looked at.",
    no_bill_fits_limit: "Paying bills: your limit allows none yet.",
    loan_before_collect: "A loan before collecting what you are owed.",
    no_late_payers: "Collecting, when nobody is late.",
    nothing_to_reorder: "Reordering, when nothing runs out this week.",
    no_festival_order: "Moving a festival order that does not exist.",
    no_loan_needed: "A loan this week does not need.",
    order_moved: "A loan for the festival order, which moves out of this week instead.",
  },
  fix: {
    collect_moved_first: () => "Put collecting first.",
    personal_data_removed: (count) =>
      `Removed ${count} personal ${count === 1 ? "detail" : "details"} before they reached Gemini.`,
    stopped_early: () => "Stopped early to stay inside the context budget.",
  },
  privacy: "Gemini saw no customer names or phone numbers.",
  byRulesBlocked: "Planned by fixed rules: the AI's plan broke your rules, so it was not used.",
};

const ta: GuardrailWords = {
  checked: "உங்கள் விதிகளோடு சரிபார்த்தேன்",
  railMeta: (rules, blocked, fixed) =>
    blocked > 0
      ? `${rules} விதிகள்: ${blocked} படி நிறுத்தப்பட்டது`
      : fixed > 0
        ? `${rules} விதிகள்: திருத்தத்துக்குப் பின் சரி`
        : `${rules} விதிகள்: எல்லாம் சரி`,
  stoppedTitle: "உங்கள் விதிகள் நிறுத்தியவை",
  why: {
    off_schema: "AI அனுமதி இல்லாத படியைச் சொன்னது, அதனால் அந்தத் திட்டம் ஏற்கப்படவில்லை.",
    repeated: "ஒரே படி இரண்டு முறை.",
    unknown_customer: "தாமதமாகக் கட்டாதவரிடம் வசூல்.",
    unknown_bill: "உங்கள் வரம்பு காட்டாத பில்லைக் கட்டுவது.",
    unknown_distributor: "எதுவும் தீராத விநியோகஸ்தரிடம் ஆர்டர்.",
    festival_not_checked: "பண்டிகை ஆர்டரைப் பார்க்காமலேயே தள்ளிவைப்பது.",
    loan_not_checked: "முகவர் பார்க்காத கடன்.",
    no_bill_fits_limit: "பில் கட்டுவது: உங்கள் வரம்பு இன்னும் எதையும் அனுமதிக்கவில்லை.",
    loan_before_collect: "வர வேண்டியதை வசூல் செய்வதற்கு முன்பே கடன்.",
    no_late_payers: "யாரும் தாமதம் இல்லாதபோது வசூல்.",
    nothing_to_reorder: "இந்த வாரம் எதுவும் தீராதபோது ஆர்டர்.",
    no_festival_order: "இல்லாத பண்டிகை ஆர்டரைத் தள்ளிவைப்பது.",
    no_loan_needed: "இந்த வாரத்துக்குத் தேவையில்லாத கடன்.",
    order_moved: "பண்டிகை ஆர்டர் அடுத்த வாரம் போவதால், அதற்கான கடன் தேவையில்லை.",
  },
  fix: {
    collect_moved_first: () => "வசூலை முதலில் வைத்தேன்.",
    personal_data_removed: (count) =>
      `Gemini-க்குப் போகும் முன் ${count} தனிப்பட்ட விவரங்களை நீக்கினேன்.`,
    stopped_early: () => "சூழல் வரம்புக்குள் இருக்க முன்பே நிறுத்தினேன்.",
  },
  privacy: "வாடிக்கையாளர் பெயரோ தொலைபேசி எண்ணோ Gemini பார்க்கவில்லை.",
  byRulesBlocked:
    "நிலையான விதிகளால் திட்டமிடப்பட்டது: AI-யின் திட்டம் உங்கள் விதிகளை மீறியதால் ஏற்கப்படவில்லை.",
};

export function guardrailWordsFor(lang: Lang): GuardrailWords {
  return lang === "ta" ? ta : en;
}

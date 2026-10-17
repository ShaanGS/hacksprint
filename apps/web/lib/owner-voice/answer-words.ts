import { formatMoney } from "@/lib/money";
import type { CustomerStatus } from "@/lib/rotation/credit";
import type { ForecastState } from "@/lib/rotation/forecast";

// The fixed sentences a spoken question is answered with, in Tamil and English. Code fills in
// every number (spec rule 1); the model only chose which question it was.

const m = formatMoney;

type Due = { distributor: string; amountPaise: number; dueOn: string; overdueDays: number };

export type AnswerWords = {
  week: (
    state: ForecastState,
    gapPaise: number,
    neededPaise: number,
    likelyPaise: number,
  ) => string;
  lateCanBring: (customers: number, paise: number) => string;
  lateList: (count: number, list: string, first: string) => string;
  nobodyLate: (count: number, paise: number) => string;
  nobodyOwes: string;
  owes: (name: string, paise: number, status: CustomerStatus) => string;
  owesNothing: (name: string) => string;
  noName: string;
  stock: (onShelfPaise: number, stuckPaise: number) => string;
  low: (names: string) => string;
  dues: (totalPaise: number) => string;
  overdue: (due: Due) => string;
  next: (due: Due) => string;
  noDues: string;
  loan: (festival: string, needPaise: number, loanPaise: number, band: string) => string;
  noLoan: (latePaise: number) => string;
  noOrder: string;
  items: (totalPaise: number, lines: string) => string;
  noItems: string;
  notSold: (names: string) => string;
  collectAgent: (customers: number, paise: number) => string;
  collectNobody: string;
  reorderAgent: (count: number, names: string) => string;
  reorderNothing: string;
  planAgent: (short: boolean, gapPaise: number) => string;
};

const en: AnswerWords = {
  week: (state, gap, needed, likely) =>
    state === "short"
      ? `This week you are short by ${m(-gap)}. Your bills need ${m(needed)} and about ${m(likely)} is likely to come in.`
      : state === "close"
        ? `This week is only just enough: ${m(gap)} spare. Your bills need ${m(needed)} and about ${m(likely)} is likely to come in.`
        : `This week you have about ${m(gap)} spare. Your bills need ${m(needed)} and about ${m(likely)} is likely to come in.`,
  lateCanBring: (customers, paise) =>
    ` Collecting from ${customers} late ${customers === 1 ? "payer" : "payers"} would bring ${m(paise)}.`,
  lateList: (count, list, first) =>
    `${count} ${count === 1 ? "customer is" : "customers are"} late: ${list}. Start with ${first}.`,
  nobodyLate: (count, paise) =>
    `Nobody is late. ${count} ${count === 1 ? "customer owes" : "customers owe"} you ${m(paise)}.`,
  nobodyOwes: "Nobody owes you money.",
  owes: (name, paise, status) => {
    const habit =
      status.kind === "late"
        ? ` Usually pays in ${Math.round(status.usualDays)} days; ${Math.round(status.daysLate)} days late now.`
        : status.kind === "unknown"
          ? " Not enough repayments yet to know the habit."
          : ` Usually pays in ${Math.round(status.usualDays)} days; due in ${Math.round(status.dueInDays)} days.`;
    return `${name} owes ${m(paise)}.${habit}`;
  },
  owesNothing: (name) => `${name} owes nothing.`,
  noName: "I did not catch the name. Open Collect to see everyone who owes you.",
  stock: (onShelf, stuck) =>
    `Your shelf is worth about ${m(onShelf)} at cost, as an estimate. ${m(stuck)} of it is stuck in slow items.`,
  low: (names) => ` Running low: ${names}.`,
  dues: (total) => `You owe suppliers ${m(total)}.`,
  overdue: (due) =>
    ` ${due.distributor}, ${m(due.amountPaise)}, is ${due.overdueDays} ${due.overdueDays === 1 ? "day" : "days"} overdue.`,
  next: (due) => ` Next due: ${due.distributor}, ${m(due.amountPaise)}, on ${due.dueOn}.`,
  noDues: "You owe your suppliers nothing.",
  loan: (festival, need, loan, band) =>
    `For the ${festival} order of ${m(need)} you need a loan of about ${m(loan)}: Mudra ${band}, no collateral. Open Bank to make the pack.`,
  noLoan: (late) =>
    `You do not need a loan. Collecting ${m(late)} from your late payers covers the order.`,
  noOrder: "There is no festival order to check a loan for. Open Bank to see your dues.",
  items: (total, lines) => `That comes to ${m(total)}: ${lines}.`,
  noItems: "I could not find those items in your shop.",
  notSold: (names) => ` Not in your shop's list: ${names}.`,
  collectAgent: (customers, paise) =>
    `${customers} late ${customers === 1 ? "payer owes" : "payers owe"} ${m(paise)}. The agent writes each reminder with a payment link; you send them from your WhatsApp.`,
  collectNobody: "Nobody is late, so there is nothing for the agent to collect.",
  reorderAgent: (count, names) =>
    `${count} ${count === 1 ? "item runs" : "items run"} out this week: ${names}. The agent orders them at your last bill's quantity, after you approve.`,
  reorderNothing: "Nothing runs out this week, so there is nothing to order.",
  planAgent: (short, gap) =>
    `${short ? `This week you are short by ${m(-gap)}.` : `This week has ${m(gap)} to spare.`} The agent looks at your bills, late payers and stock, and puts the steps in order. You decide each one.`,
};

const ta: AnswerWords = {
  week: (state, gap, needed, likely) =>
    state === "short"
      ? `இந்த வாரம் ${m(-gap)} குறைவு. பில்களுக்கு ${m(needed)} தேவை, சுமார் ${m(likely)} வர வாய்ப்பு.`
      : state === "close"
        ? `இந்த வாரம் சரியாகத்தான் போதும்: ${m(gap)} மீதம். பில்களுக்கு ${m(needed)} தேவை, சுமார் ${m(likely)} வர வாய்ப்பு.`
        : `இந்த வாரம் சுமார் ${m(gap)} மீதம். பில்களுக்கு ${m(needed)} தேவை, சுமார் ${m(likely)} வர வாய்ப்பு.`,
  lateCanBring: (customers, paise) =>
    ` தாமதமான ${customers} பேரிடம் வசூலித்தால் ${m(paise)} வரும்.`,
  lateList: (count, list, first) =>
    `${count} பேர் தாமதம்: ${list}. முதலில் ${first}-இடம் கேளுங்கள்.`,
  nobodyLate: (count, paise) =>
    `யாரும் தாமதமில்லை. ${count} பேர் உங்களுக்கு ${m(paise)} தர வேண்டும்.`,
  nobodyOwes: "யாரும் உங்களுக்குப் பணம் தர வேண்டியதில்லை.",
  owes: (name, paise, status) => {
    const habit =
      status.kind === "late"
        ? ` வழக்கமாக ${Math.round(status.usualDays)} நாளில் தருவார்; இப்போது ${Math.round(status.daysLate)} நாள் தாமதம்.`
        : status.kind === "unknown"
          ? " பழக்கம் தெரிய இன்னும் போதிய பதிவுகள் இல்லை."
          : ` வழக்கமாக ${Math.round(status.usualDays)} நாளில் தருவார்; இன்னும் ${Math.round(status.dueInDays)} நாள்.`;
    return `${name} ${m(paise)} தர வேண்டும்.${habit}`;
  },
  owesNothing: (name) => `${name} எதுவும் தர வேண்டியதில்லை.`,
  noName: "பெயர் கேட்கவில்லை. எல்லாரையும் பார்க்க வசூல் பக்கத்தைத் திறங்கள்.",
  stock: (onShelf, stuck) =>
    `உங்கள் அலமாரி சரக்கு வாங்கிய விலையில் சுமார் ${m(onShelf)}; இது மதிப்பீடு. மெதுவாக விற்கும் சரக்கில் ${m(stuck)} முடங்கியுள்ளது.`,
  low: (names) => ` குறைவாக உள்ளவை: ${names}.`,
  dues: (total) => `சப்ளையர்களுக்கு ${m(total)} பாக்கி.`,
  overdue: (due) =>
    ` ${due.distributor} ${m(due.amountPaise)}, கெடு தாண்டி ${due.overdueDays} நாள்.`,
  next: (due) => ` அடுத்து: ${due.dueOn} அன்று ${due.distributor} ${m(due.amountPaise)}.`,
  noDues: "சப்ளையர்களுக்கு பாக்கி எதுவும் இல்லை.",
  loan: (festival, need, loan, band) =>
    `${festival} ஆர்டர் ${m(need)}-க்கு சுமார் ${m(loan)} கடன் தேவை: முத்ரா ${band}, அடமானம் தேவையில்லை. தொகுப்பு தயாரிக்க வங்கி பக்கத்தைத் திறங்கள்.`,
  noLoan: (late) => `கடன் தேவையில்லை. தாமதமானவர்களிடம் ${m(late)} வசூலித்தால் ஆர்டருக்குப் போதும்.`,
  noOrder:
    "கடன் பார்க்க பண்டிகை ஆர்டர் எதுவும் இல்லை. பாக்கியைப் பார்க்க வங்கி பக்கத்தைத் திறங்கள்.",
  items: (total, lines) => `மொத்தம் ${m(total)}: ${lines}.`,
  noItems: "அந்தப் பொருட்கள் உங்கள் கடையில் இல்லை.",
  notSold: (names) => ` உங்கள் கடைப் பட்டியலில் இல்லை: ${names}.`,
  collectAgent: (customers, paise) =>
    `${customers} பேர் தாமதமாக ${m(paise)} தர வேண்டும். ஒவ்வொருவருக்கும் பணம் செலுத்தும் லிங்க் உடன் நினைவூட்டலை முகவர் எழுதும்; நீங்கள் உங்கள் WhatsApp-இல் அனுப்புங்கள்.`,
  collectNobody: "யாரும் தாமதமாக இல்லை; முகவர் வசூலிக்க எதுவும் இல்லை.",
  reorderAgent: (count, names) =>
    `இந்த வாரம் ${count} பொருட்கள் தீர்ந்துவிடும்: ${names}. நீங்கள் ஒப்புக்கொண்ட பிறகு, கடைசி பில் அளவில் முகவர் ஆர்டர் செய்யும்.`,
  reorderNothing: "இந்த வாரம் எதுவும் தீராது; ஆர்டர் செய்ய எதுவும் இல்லை.",
  planAgent: (short, gap) =>
    `${short ? `இந்த வாரம் ${m(-gap)} பற்றாக்குறை.` : `இந்த வாரம் ${m(gap)} மீதம்.`} பில்கள், தாமதமாகக் கட்டுபவர்கள், சரக்கு எல்லாம் பார்த்து முகவர் வரிசைப்படுத்தும். ஒவ்வொன்றையும் நீங்களே முடிவு செய்யுங்கள்.`,
};

export function answerWordsFor(lang: "en" | "ta"): AnswerWords {
  return lang === "ta" ? ta : en;
}

import type { CostKind } from "@/lib/setup";
import type { Lang } from "@/lib/i18n/languages";
import type { EntryKind, LoanPurpose, Reason } from "@/lib/owner/api";
import type { CustomerStatus } from "@/lib/rotation/credit";
import type { SourceLabel } from "@/lib/rotation/labels";
import type { RotationPart } from "@/lib/rotation/sources";

// The money screens' words (spec A to D), in Tamil and English. Numbers come in already written
// (formatMoney, dates in the reader's language); these only place them in a sentence.

type Money = string;
type WeekState = "short" | "close" | "ok";
type PaidVia = "cash" | "bank" | "upi";

export type MoneyText = {
  tabs: { home: string; collect: string; stock: string; bank: string };
  demoData: string;
  demoToolsText: string;
  sendRecording: string;
  resetDemo: string;
  resetSure: string;
  demoReset: string;
  labels: Record<SourceLabel, string>;
  loadFailed: string;
  tryAgain: string;
  holdAndSpeak: string;
  holdLonger: string;
  micAllow: string;
  micTurnOn: string;
  micReady: string;
  // The voice card (B1)
  entryTitles: Record<EntryKind, string>;
  notUnderstoodEntry: string;
  sayEntryAgain: string;
  answerTitle: string;
  openTab: (tab: string) => string;
  done: string;
  cashSales: string;
  moneyInHand: string;
  counted: string;
  notSaid: string;
  whose: string;
  whichItem: string;
  sayAgain: string;
  saveCredit: (amount: Money, name: string) => string;
  saveRepaid: (amount: Money, name: string) => string;
  saveDayClose: string;
  saveCount: (qty: string) => string;
  notThis: string;
  saved: string;
  // Home (A1, A2, 11a)
  homeTitle: string;
  weekRange: (from: string, to: string) => string;
  weekState: Record<WeekState, string>;
  neededLikely: (needed: Money, likely: Money) => string;
  collectLate: (count: number, amount: Money) => string;
  seeWho: string;
  whereMoney: string;
  parts: Record<RotationPart, string>;
  costUnknown: (count: number) => string;
  neededTitle: string;
  likelyTitle: string;
  billsDue: (count: number, overdue: Money | null) => string;
  costsMeta: string;
  saidAt: (time: string) => string;
  notSaidLately: string;
  paidSince: (amount: Money) => string;
  daysUsed: (days: number) => string;
  customersDue: (count: number) => string;
  asks: { money_in_hand: string; cash_sales: string };
  askHint: string;
  valueTitle: string;
  recovered: string;
  recoveredLine: (verified: Money, declared: Money) => string;
  cycle: string;
  cycleMeaning: string;
  cycleLine: (now: number | null, first: number | null) => string;
  // Where a number came from (E3)
  addsUpTo: string;
  usualWeek: string;
  usualWeekNote: string;
  nothingHere: string;
  overdueBy: (days: number) => string;
  dueOn: (date: string) => string;
  costs: Record<CostKind, string>;
  perMonth: string;
  perWeek: string;
  moneyInHandSaid: string;
  paymentIn: string;
  daySales: string;
  status: Record<CustomerStatus["kind"], string>;
  owesSince: (date: string) => string;
  countedOn: (date: string) => string;
  notCounted: string;
  // Collect (A3 to A5)
  collectTitle: string;
  lateLine: (count: number) => string;
  collectOrder: string;
  reason: (reason: Reason) => string;
  lateBadge: string;
  linkReady: string;
  nobodyOwes: string;
  creditKinds: { credit_sale: string; repayment: string };
  everyEntry: string;
  remind: string;
  messageIn: (language: string) => string;
  youSend: string;
  openWhatsApp: string;
  markPaid: string;
  paidIn: (name: string, amount: Money) => string;
  // Stock (B2, B3, C1, C2)
  stockTitle: string;
  shelfHero: string;
  festivalTitle: (festival: string) => string;
  festivalLine: (distributor: string, items: number) => string;
  festivalLoan: string;
  stuckTitle: string;
  dontReorder: string;
  countTitle: string;
  countHint: string;
  everyItem: string;
  estimateNote: string;
  about: (left: string) => string;
  daysLeft: (days: number) => string;
  notMoving: string;
  lowBadge: string;
  slowBadge: string;
  // Bank (D1 to D4, B7)
  bankTitle: string;
  loanTitle: string;
  loanText: string;
  purposes: Record<LoanPurpose, string>;
  check: string;
  needLoan: (amount: Money) => string;
  noLoan: string;
  noLoanLine: (amount: Money, count: number) => string;
  mathOrder: (festival: string) => string;
  mathSaid: string;
  mathSpare: string;
  mathShort: string;
  mathCollect: string;
  mathLoan: string;
  askFor: string;
  beforeApply: string;
  udyamTitle: string;
  udyamAssistTitle: string;
  whereApply: string;
  officialLinks: string;
  checkedOn: (date: string) => string;
  makePack: string;
  packText: string;
  openPack: string;
  statementTitle: string;
  statementText: string;
  makeStatement: string;
  openStatement: string;
  duesTitle: string;
  festivalBadge: string;
  noDues: string;
  paidThisBill: string;
  paidVia: Record<PaidVia, string>;
  billPaid: (distributor: string) => string;
  costsTitle: string;
  costAmount: (amount: Money, period: "week" | "month") => string;
  weekTotal: (amount: Money) => string;
};

const plural = (count: number, one: string, many: string) => (count === 1 ? one : many);

const en: MoneyText = {
  tabs: { home: "Home", collect: "Collect", stock: "Stock", bank: "Bank" },
  demoData: "Demo data",
  demoToolsText:
    "Every number here comes from demo data seeded into the database. These are the stage fallbacks.",
  sendRecording: "Send a recorded entry",
  resetDemo: "Reset the demo shop",
  resetSure: "Tap again to reset",
  demoReset: "The demo shop is back as it was",
  labels: {
    verified_payment: "Verified payment",
    supplier_bill: "Supplier bill",
    owner_said: "You said",
    estimate: "Estimate",
  },
  loadFailed: "Could not reach the shop.",
  tryAgain: "Try again",
  holdAndSpeak: "Hold and speak",
  holdLonger: "Hold the mic while you speak",
  micAllow: "Allow the microphone to speak your entries",
  micTurnOn: "Tap to turn on the microphone",
  micReady: "Microphone on. Hold the button and speak.",
  entryTitles: {
    credit_given: "Credit given",
    credit_repaid_cash: "Paid back in cash",
    day_close: "Tonight's numbers",
    stock_count: "Stock count",
  },
  notUnderstoodEntry: "Not understood",
  sayEntryAgain:
    'Say an entry, like "Ramesh 200 on credit", or ask about your money, like "can I pay this week?"',
  answerTitle: "Your answer",
  openTab: (tab) => `Open ${tab}`,
  done: "Done",
  cashSales: "Cash sales today",
  moneyInHand: "Money in hand, cash and bank",
  counted: "Counted",
  notSaid: "Not said",
  whose: "Whose account?",
  whichItem: "Which item?",
  sayAgain: "The number was not heard. Hold the mic and say it again.",
  saveCredit: (amount, name) => `Add ${amount} to ${name}`,
  saveRepaid: (amount, name) => `${name} paid ${amount}`,
  saveDayClose: "Save tonight's numbers",
  saveCount: (qty) => `Save count of ${qty}`,
  notThis: "Not this",
  saved: "Saved",
  homeTitle: "Your money",
  weekRange: (from, to) => `${from} to ${to}`,
  weekState: {
    short: "Short this week",
    close: "Only just enough this week",
    ok: "Spare this week",
  },
  neededLikely: (needed, likely) => `Needed ${needed} · Likely ${likely}`,
  collectLate: (count, amount) =>
    `Collect from ${count} late ${plural(count, "payer", "payers")}: +${amount}`,
  seeWho: "See who",
  whereMoney: "Where your money is",
  parts: {
    due_7d: "Bills due this week",
    owed_to_suppliers: "Owed to suppliers",
    weekly_costs: "Weekly costs",
    money_now: "Money in hand",
    usual_week_sales: "A usual week's sales",
    from_customers: "Customers due to pay",
    late: "Late payers",
    with_customers: "With customers",
    on_shelf: "On the shelf",
  },
  costUnknown: (count) => `${count} ${plural(count, "item has", "items have")} no bill cost yet`,
  neededTitle: "Needed this week",
  likelyTitle: "Likely this week",
  billsDue: (count, overdue) =>
    `${count} ${plural(count, "bill", "bills")}${overdue ? ` · ${overdue} overdue` : ""}`,
  costsMeta: "Rent, staff, home and cash buying",
  saidAt: (time) => `You said at ${time}`,
  notSaidLately: "Not said in the last 2 days",
  paidSince: (amount) => `plus ${amount} paid since`,
  daysUsed: (days) => `From ${days} days of your numbers`,
  customersDue: (count) => `${count} ${plural(count, "customer", "customers")} usually pay by then`,
  asks: {
    money_in_hand: "Say your money in hand tonight, cash and bank together.",
    cash_sales: "Say each night's cash sales, so the week can be worked out.",
  },
  askHint: 'Hold the mic and say "sales 5,000, in hand 7,200"',
  valueTitle: "What changed",
  recovered: "Late credit recovered, last 30 days",
  recoveredLine: (verified, declared) => `${verified} verified · ${declared} you said`,
  cycle: "Money cycle",
  cycleMeaning: "Days from buying stock to having the money back",
  cycleLine: (now, first) =>
    now === null
      ? "Not enough records yet"
      : first === null
        ? `${now} days`
        : `${now} days now, ${first} in your first weeks`,
  addsUpTo: "Adds up to",
  usualWeek: "A usual week",
  usualWeekNote: "Seven times the average of these days",
  nothingHere: "Nothing here yet.",
  overdueBy: (days) => `Overdue ${days} ${plural(days, "day", "days")}`,
  dueOn: (date) => `Due ${date}`,
  costs: {
    rent: "Rent",
    staff: "Staff",
    home: "Home",
    cash_purchases: "Cash buying",
    other: "Other",
  },
  perMonth: "A month, spread over its weeks",
  perWeek: "Each week",
  moneyInHandSaid: "Money in hand, as you said",
  paymentIn: "Payment received",
  daySales: "Cash you said plus verified payments",
  status: {
    late: "Late",
    due: "Due this week",
    later: "Due later",
    unknown: "Habit not known yet",
  },
  owesSince: (date) => `Owes since ${date}`,
  countedOn: (date) => `Counted ${date}`,
  notCounted: "Not counted",
  collectTitle: "Collect",
  lateLine: (count) =>
    count === 0
      ? "Nobody is past their usual days"
      : `${count} ${plural(count, "customer is", "customers are")} past their usual days`,
  collectOrder: "Late payers first, then by amount",
  reason: (reason) => {
    switch (reason.kind) {
      case "late":
        return `Usually pays in ${reason.usual_days} days · ${reason.days_late} ${plural(reason.days_late, "day", "days")} late`;
      case "unknown":
        return `Habit not known yet: ${reason.settled} ${plural(reason.settled, "credit", "credits")} paid off so far`;
      case "due":
      case "later":
        return reason.due_in_days === 0
          ? `Usually pays in ${reason.usual_days} days · due today`
          : `Usually pays in ${reason.usual_days} days · due in ${reason.due_in_days} ${plural(reason.due_in_days, "day", "days")}`;
    }
  },
  lateBadge: "Late",
  linkReady: "Link ready",
  nobodyOwes: "Nobody owes you money.",
  creditKinds: { credit_sale: "Credit given", repayment: "Paid back" },
  everyEntry: "Every entry",
  remind: "Remind on WhatsApp",
  messageIn: (language) => `Message in ${language}`,
  youSend: "WhatsApp opens with this message and the payment link. You press send.",
  openWhatsApp: "Open WhatsApp",
  markPaid: "Mark paid (demo)",
  paidIn: (name, amount) => `${name} paid ${amount}`,
  stockTitle: "Stock",
  shelfHero: "On the shelf, at cost",
  festivalTitle: (festival) => `${festival} order`,
  festivalLine: (distributor, items) =>
    `${distributor} · ${items} ${plural(items, "item", "items")}, priced from bills`,
  festivalLoan: "Check the loan for it",
  stuckTitle: "Money stuck in slow items",
  dontReorder: "Do not reorder these yet",
  countTitle: "Count these by voice",
  countHint: 'Hold the mic and say "atta, 12 packs"',
  everyItem: "Every item",
  estimateNote: "Estimate: last count, plus bills, minus usual sales",
  about: (left) => `About ${left}`,
  daysLeft: (days) => `${days} ${plural(days, "day", "days")} left`,
  notMoving: "Not selling",
  lowBadge: "Low",
  slowBadge: "Slow",
  bankTitle: "Bank",
  loanTitle: "Do you need a loan?",
  loanText: "Worked out from your own numbers and the festival order.",
  purposes: { stock_rotation: "Stock and running the shop", equipment: "Equipment or shop work" },
  check: "Check",
  needLoan: (amount) => `You need about ${amount}`,
  noLoan: "You do not need a loan",
  noLoanLine: (amount, count) =>
    `Collect ${amount} from ${count} late ${plural(count, "payer", "payers")} instead.`,
  mathOrder: (festival) => `${festival} order`,
  mathSaid: "What you said you need",
  mathSpare: "Spare this week without it",
  mathShort: "Short this week even without it",
  mathCollect: "Late payers can bring",
  mathLoan: "Loan, rounded up to the next ₹1,000",
  askFor: "What to ask the bank for",
  beforeApply: "Before you apply",
  udyamTitle: "Register on Udyam",
  udyamAssistTitle: "Ask your bank for Udyam Assist",
  whereApply: "Where to apply",
  officialLinks: "Official links",
  checkedOn: (date) => `Facts checked on ${date}`,
  makePack: "Make the loan pack",
  packText:
    "Statement, stock quotation, document checklist and official links. Print it and take it to your bank yourself.",
  openPack: "Open the loan pack",
  statementTitle: "Shop statement",
  statementText:
    "The last 3 full months. Verified and what you said kept apart; totals only, no customer names.",
  makeStatement: "Make the statement",
  openStatement: "Open the statement",
  duesTitle: "Supplier dues",
  festivalBadge: "Festival order",
  noDues: "No supplier bills to pay.",
  paidThisBill: "Did you pay this bill?",
  paidVia: { cash: "Paid in cash", bank: "Paid from the bank", upi: "Paid by UPI" },
  billPaid: (distributor) => `${distributor} bill marked paid`,
  costsTitle: "Weekly costs, as you said",
  costAmount: (amount, period) => `${amount} a ${period}`,
  weekTotal: (amount) => `${amount} a week in all`,
};

const ta: MoneyText = {
  tabs: { home: "முகப்பு", collect: "வசூல்", stock: "சரக்கு", bank: "வங்கி" },
  demoData: "டெமோ தரவு",
  demoToolsText:
    "இங்குள்ள எல்லா எண்களும் தரவுத்தளத்தில் சேர்த்த டெமோ தரவிலிருந்து வருகின்றன. இவை மேடைக்கான மாற்று வழிகள்.",
  sendRecording: "பதிவு செய்த குரலை அனுப்பு",
  resetDemo: "டெமோ கடையை மீட்டமை",
  resetSure: "மீட்டமைக்க மீண்டும் தட்டுங்கள்",
  demoReset: "டெமோ கடை பழைய நிலைக்குத் திரும்பியது",
  labels: {
    verified_payment: "சரிபார்த்த பணம்",
    supplier_bill: "சப்ளையர் பில்",
    owner_said: "நீங்கள் சொன்னது",
    estimate: "மதிப்பீடு",
  },
  loadFailed: "கடையின் கணக்கை எடுக்க முடியவில்லை.",
  tryAgain: "மீண்டும் முயற்சி",
  holdAndSpeak: "பிடித்துப் பேசுங்கள்",
  holdLonger: "பேசும்போது மைக்கைப் பிடித்தே இருங்கள்",
  micAllow: "குரலில் சொல்ல, மைக்கை அனுமதியுங்கள்",
  micTurnOn: "மைக்கை இயக்க இங்கே தட்டுங்கள்",
  micReady: "மைக் தயார். பட்டனைப் பிடித்துப் பேசுங்கள்.",
  entryTitles: {
    credit_given: "கடன் கொடுத்தது",
    credit_repaid_cash: "ரொக்கமாகத் திருப்பித் தந்தது",
    day_close: "இன்றைய கணக்கு",
    stock_count: "சரக்கு எண்ணிக்கை",
  },
  notUnderstoodEntry: "புரியவில்லை",
  sayEntryAgain:
    '"ரமேஷ் 200 கடன்" போல ஒரு பதிவைச் சொல்லுங்கள், அல்லது "இந்த வாரம் பணம் போதுமா?" போல உங்கள் பணம் பற்றிக் கேளுங்கள்.',
  answerTitle: "பதில்",
  openTab: (tab) => `${tab} திற`,
  done: "சரி",
  cashSales: "இன்றைய ரொக்க விற்பனை",
  moneyInHand: "கையிருப்பு, ரொக்கமும் வங்கியும்",
  counted: "எண்ணியது",
  notSaid: "சொல்லவில்லை",
  whose: "யார் கணக்கு?",
  whichItem: "எந்தப் பொருள்?",
  sayAgain: "எண் கேட்கவில்லை. மைக்கைப் பிடித்து மீண்டும் சொல்லுங்கள்.",
  saveCredit: (amount, name) => `${name} கணக்கில் ${amount} சேர்`,
  saveRepaid: (amount, name) => `${name} ${amount} தந்தார்`,
  saveDayClose: "இன்றைய கணக்கைச் சேமி",
  saveCount: (qty) => `எண்ணிக்கை ${qty} சேமி`,
  notThis: "இது இல்லை",
  saved: "சேமிக்கப்பட்டது",
  homeTitle: "உங்கள் பணம்",
  weekRange: (from, to) => `${from} முதல் ${to} வரை`,
  weekState: {
    short: "இந்த வாரம் பணம் குறைவு",
    close: "இந்த வாரம் சரியாகத்தான் போதும்",
    ok: "இந்த வாரம் மீதம்",
  },
  neededLikely: (needed, likely) => `தேவை ${needed} · வர வாய்ப்பு ${likely}`,
  collectLate: (count, amount) => `தாமதமான ${count} பேரிடம் வசூலித்தால்: +${amount}`,
  seeWho: "யார் என்று பாருங்கள்",
  whereMoney: "உங்கள் பணம் எங்கே",
  parts: {
    due_7d: "இந்த வாரம் கட்ட வேண்டிய பில்கள்",
    owed_to_suppliers: "சப்ளையர் பாக்கி",
    weekly_costs: "வாரச் செலவுகள்",
    money_now: "கையிருப்பு பணம்",
    usual_week_sales: "வழக்கமான வார விற்பனை",
    from_customers: "தர வேண்டிய வாடிக்கையாளர்கள்",
    late: "தாமதமாகத் தருபவர்கள்",
    with_customers: "வாடிக்கையாளர் கடன்",
    on_shelf: "அலமாரியில் சரக்கு",
  },
  costUnknown: (count) => `${count} பொருளுக்கு இன்னும் பில் விலை இல்லை`,
  neededTitle: "இந்த வாரம் தேவை",
  likelyTitle: "இந்த வாரம் வர வாய்ப்பு",
  billsDue: (count, overdue) => `${count} பில்கள்${overdue ? ` · ${overdue} கெடு தாண்டியது` : ""}`,
  costsMeta: "வாடகை, சம்பளம், வீடு, ரொக்கக் கொள்முதல்",
  saidAt: (time) => `நீங்கள் ${time}-க்குச் சொன்னது`,
  notSaidLately: "கடந்த 2 நாளில் சொல்லவில்லை",
  paidSince: (amount) => `பிறகு வந்த ${amount} சேர்த்து`,
  daysUsed: (days) => `உங்கள் ${days} நாள் கணக்கிலிருந்து`,
  customersDue: (count) => `${count} பேர் வழக்கமாக அதற்குள் தருவார்கள்`,
  asks: {
    money_in_hand: "இன்றிரவு கையிருப்பு பணத்தைச் சொல்லுங்கள், ரொக்கமும் வங்கியும் சேர்த்து.",
    cash_sales: "வாரக் கணக்குக்கு, தினமும் இரவு அன்றைய ரொக்க விற்பனையைச் சொல்லுங்கள்.",
  },
  askHint: 'மைக்கைப் பிடித்து "விற்பனை 5,000, கையில் 7,200" என்று சொல்லுங்கள்',
  valueTitle: "என்ன மாறியது",
  recovered: "கடந்த 30 நாளில் வசூலான தாமதக் கடன்",
  recoveredLine: (verified, declared) => `${verified} சரிபார்த்தது · ${declared} நீங்கள் சொன்னது`,
  cycle: "பணச் சுழற்சி",
  cycleMeaning: "சரக்கு வாங்கியதிலிருந்து பணம் திரும்ப வர ஆகும் நாட்கள்",
  cycleLine: (now, first) =>
    now === null
      ? "இன்னும் போதிய பதிவுகள் இல்லை"
      : first === null
        ? `${now} நாள்`
        : `இப்போது ${now} நாள், முதல் வாரங்களில் ${first} நாள்`,
  addsUpTo: "மொத்தம்",
  usualWeek: "வழக்கமான வாரம்",
  usualWeekNote: "இந்த நாட்களின் சராசரியின் 7 மடங்கு",
  nothingHere: "இன்னும் எதுவும் இல்லை.",
  overdueBy: (days) => `கெடு தாண்டி ${days} நாள்`,
  dueOn: (date) => `${date} கெடு`,
  costs: {
    rent: "வாடகை",
    staff: "சம்பளம்",
    home: "வீட்டுச் செலவு",
    cash_purchases: "ரொக்கக் கொள்முதல்",
    other: "மற்றவை",
  },
  perMonth: "மாதச் செலவு, வாரங்களாகப் பிரித்து",
  perWeek: "ஒவ்வொரு வாரமும்",
  moneyInHandSaid: "நீங்கள் சொன்ன கையிருப்பு",
  paymentIn: "வந்த பணம்",
  daySales: "நீங்கள் சொன்ன ரொக்கம் + சரிபார்த்த பணம்",
  status: {
    late: "தாமதம்",
    due: "இந்த வாரம் தர வேண்டியவர்",
    later: "பின்னர் தருவார்",
    unknown: "பழக்கம் இன்னும் தெரியவில்லை",
  },
  owesSince: (date) => `${date} முதல் பாக்கி`,
  countedOn: (date) => `${date} எண்ணியது`,
  notCounted: "எண்ணவில்லை",
  collectTitle: "வசூல்",
  lateLine: (count) =>
    count === 0 ? "யாரும் தாமதமில்லை" : `${count} பேர் வழக்கமான நாளைத் தாண்டிவிட்டனர்`,
  collectOrder: "முதலில் தாமதமானவர்கள், பிறகு தொகைப்படி",
  reason: (reason) => {
    switch (reason.kind) {
      case "late":
        return `வழக்கமாக ${reason.usual_days} நாளில் தருவார் · ${reason.days_late} நாள் தாமதம்`;
      case "unknown":
        return `பழக்கம் இன்னும் தெரியவில்லை: இதுவரை ${reason.settled} கடன் அடைத்தார்`;
      case "due":
      case "later":
        return reason.due_in_days === 0
          ? `வழக்கமாக ${reason.usual_days} நாளில் தருவார் · இன்று தர வேண்டும்`
          : `வழக்கமாக ${reason.usual_days} நாளில் தருவார் · இன்னும் ${reason.due_in_days} நாள்`;
    }
  },
  lateBadge: "தாமதம்",
  linkReady: "லிங்க் தயார்",
  nobodyOwes: "யாரும் உங்களுக்குப் பணம் தர வேண்டியதில்லை.",
  creditKinds: { credit_sale: "கடன் கொடுத்தது", repayment: "திருப்பித் தந்தது" },
  everyEntry: "எல்லாப் பதிவுகளும்",
  remind: "WhatsApp-ல் நினைவூட்டு",
  messageIn: (language) => `${language} செய்தி`,
  youSend:
    "இந்தச் செய்தியும் பணம் செலுத்தும் லிங்கும் WhatsApp-ல் திறக்கும். நீங்களே அனுப்புங்கள்.",
  openWhatsApp: "WhatsApp திற",
  markPaid: "பணம் வந்ததாகக் குறி (டெமோ)",
  paidIn: (name, amount) => `${name} ${amount} செலுத்தினார்`,
  stockTitle: "சரக்கு",
  shelfHero: "அலமாரியில், வாங்கிய விலையில்",
  festivalTitle: (festival) => `${festival} ஆர்டர்`,
  festivalLine: (distributor, items) => `${distributor} · ${items} பொருட்கள், பில் விலையில்`,
  festivalLoan: "இதற்குக் கடன் தேவையா பாருங்கள்",
  stuckTitle: "மெதுவாக விற்கும் சரக்கில் முடங்கிய பணம்",
  dontReorder: "இவற்றை இப்போது மீண்டும் வாங்க வேண்டாம்",
  countTitle: "இவற்றை எண்ணிச் சொல்லுங்கள்",
  countHint: 'மைக்கைப் பிடித்து "ஆட்டா, 12 பாக்கெட்" என்று சொல்லுங்கள்',
  everyItem: "எல்லாப் பொருட்களும்",
  estimateNote: "மதிப்பீடு: கடைசி எண்ணிக்கை + பில்கள் − வழக்கமான விற்பனை",
  about: (left) => `சுமார் ${left}`,
  daysLeft: (days) => `${days} நாளுக்கு வரும்`,
  notMoving: "விற்கவில்லை",
  lowBadge: "குறைவு",
  slowBadge: "மெது",
  bankTitle: "வங்கி",
  loanTitle: "கடன் தேவையா?",
  loanText: "உங்கள் கணக்கையும் பண்டிகை ஆர்டரையும் வைத்துக் கணக்கிட்டது.",
  purposes: { stock_rotation: "சரக்கு, கடை நடத்த", equipment: "கருவி அல்லது கடை வேலை" },
  check: "பாருங்கள்",
  needLoan: (amount) => `உங்களுக்குச் சுமார் ${amount} கடன் தேவை`,
  noLoan: "உங்களுக்குக் கடன் தேவையில்லை",
  noLoanLine: (amount, count) => `பதிலாக, தாமதமான ${count} பேரிடம் ${amount} வசூலியுங்கள்.`,
  mathOrder: (festival) => `${festival} ஆர்டர்`,
  mathSaid: "நீங்கள் சொன்ன தேவை",
  mathSpare: "அது இல்லாமல் இந்த வார மீதம்",
  mathShort: "அது இல்லாமலே இந்த வாரப் பற்றாக்குறை",
  mathCollect: "தாமதமானவர்களிடம் வசூலிக்கலாம்",
  mathLoan: "கடன், அடுத்த ₹1,000-க்கு முழுமையாக்கியது",
  askFor: "வங்கியில் என்ன கேட்க வேண்டும்",
  beforeApply: "விண்ணப்பிக்கும் முன்",
  udyamTitle: "உத்யம் பதிவு செய்யுங்கள்",
  udyamAssistTitle: "உங்கள் வங்கியில் உத்யம் அசிஸ்ட் கேளுங்கள்",
  whereApply: "எங்கே விண்ணப்பிப்பது",
  officialLinks: "அதிகாரப்பூர்வ இணைப்புகள்",
  checkedOn: (date) => `${date} அன்று சரிபார்த்த தகவல்`,
  makePack: "கடன் ஆவணத் தொகுப்பைத் தயாரி",
  packText:
    "அறிக்கை, சரக்கு விலைப்பட்டியல், ஆவணப் பட்டியல், அதிகாரப்பூர்வ இணைப்புகள். அச்சிட்டு நீங்களே உங்கள் வங்கிக்கு எடுத்துச் செல்லுங்கள்.",
  openPack: "கடன் தொகுப்பைத் திற",
  statementTitle: "கடை அறிக்கை",
  statementText:
    "கடந்த 3 முழு மாதங்கள். சரிபார்த்ததும் நீங்கள் சொன்னதும் தனித்தனி; மொத்தம் மட்டும், வாடிக்கையாளர் பெயர் இல்லை.",
  makeStatement: "அறிக்கை தயாரி",
  openStatement: "அறிக்கையைத் திற",
  duesTitle: "சப்ளையர் பாக்கி",
  festivalBadge: "பண்டிகை ஆர்டர்",
  noDues: "கட்ட வேண்டிய பில் இல்லை.",
  paidThisBill: "இந்த பில்லைக் கட்டிவிட்டீர்களா?",
  paidVia: {
    cash: "ரொக்கமாகக் கட்டினேன்",
    bank: "வங்கியிலிருந்து கட்டினேன்",
    upi: "UPI-ல் கட்டினேன்",
  },
  billPaid: (distributor) => `${distributor} பில் கட்டியதாகக் குறிக்கப்பட்டது`,
  costsTitle: "நீங்கள் சொன்ன வாரச் செலவுகள்",
  costAmount: (amount, period) => (period === "month" ? `மாதம் ${amount}` : `வாரம் ${amount}`),
  weekTotal: (amount) => `மொத்தம் வாரத்துக்கு ${amount}`,
};

const texts: Partial<Record<Lang, MoneyText>> = { en, ta };

/** The money screens' words; English where we have no translation yet. */
export function moneyTextFor(lang: Lang): MoneyText {
  return texts[lang] ?? en;
}

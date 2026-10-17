import type { ChecklistItem } from "@/lib/loans/pack";

// The printed pages' words (D1, D2, D4): the shop statement and the loan pack, in Tamil and
// English. The bank may read either, so the owner picks with ?lang=.

export type PaperLang = "en" | "ta";

type Metric =
  | "digitalPayments"
  | "creditRecoveredByLink"
  | "supplierBills"
  | "cashSales"
  | "creditGiven"
  | "creditRecoveredCash"
  | "billsPaidOnTime"
  | "regularCreditCustomers"
  | "averageStockValue"
  | "moneyCycleDays";

export type PaperText = {
  statement: string;
  period: (from: string, to: string) => string;
  madeOn: (date: string) => string;
  demoNote: string;
  print: string;
  intro: string;
  verified: string;
  verifiedText: string;
  declared: string;
  declaredText: string;
  metrics: Record<Metric, string>;
  bills: (count: number) => string;
  medianDays: (days: number) => string;
  percentOf: (percent: number, bills: number) => string;
  customers: (count: number) => string;
  days: (days: number) => string;
  notEnough: string;
  seeRows: (count: number) => string;
  paidLate: string;
  paidOnTime: string;
  monthEnd: string;
  footer: string;
  loanPack: string;
  loanFor: string;
  loanNeeded: string;
  workedOut: string;
  quotation: string;
  quotationFrom: (festival: string, distributor: string) => string;
  columns: { item: string; qty: string; rate: string; amount: string };
  total: string;
  documents: string;
  checklist: Record<ChecklistItem["key"], string>;
  status: Record<ChecklistItem["status"], string>;
  scheme: string;
  noNames: string;
};

const en: PaperText = {
  statement: "Shop statement",
  period: (from, to) => `${from} to ${to}`,
  madeOn: (date) => `Made on ${date}`,
  demoNote: "Demo data: every number on this page was seeded for the demonstration.",
  print: "Print or save as PDF",
  intro:
    "Two blocks that are never added together. Each number carries the label of its weakest source. Totals only: no customer names or phone numbers.",
  verified: "Verified",
  verifiedText: "What a payment provider or a supplier's bill shows.",
  declared: "Declared",
  declaredText: "What the owner said, and estimates worked out from it.",
  metrics: {
    digitalPayments: "Digital payments received",
    creditRecoveredByLink: "Credit repaid by payment link",
    supplierBills: "Bought on supplier bills",
    cashSales: "Cash sales",
    creditGiven: "Credit given",
    creditRecoveredCash: "Credit repaid in cash",
    billsPaidOnTime: "Supplier bills paid on time",
    regularCreditCustomers: "Regular credit customers",
    averageStockValue: "Average stock on the shelf, at cost",
    moneyCycleDays: "Money cycle",
  },
  bills: (count) => `${count} ${count === 1 ? "bill" : "bills"}`,
  medianDays: (days) => `Usually repaid in ${days} days`,
  percentOf: (percent, bills) => `${percent}% of ${bills}`,
  customers: (count) => `${count} ${count === 1 ? "customer" : "customers"}`,
  days: (days) => `${days} days`,
  notEnough: "Not enough records",
  seeRows: (count) => `The ${count} ${count === 1 ? "entry" : "entries"} behind this`,
  paidLate: "Paid late",
  paidOnTime: "On time",
  monthEnd: "Month end",
  footer: "Made from the shop's own records. The owner decides who sees it.",
  loanPack: "Loan pack",
  loanFor: "For",
  loanNeeded: "Loan needed",
  workedOut: "Worked out from the shop's own numbers",
  quotation: "Stock quotation",
  quotationFrom: (festival, distributor) =>
    `${festival} order from ${distributor}, priced from supplier bills`,
  columns: { item: "Item", qty: "Qty", rate: "Rate", amount: "Amount" },
  total: "Total",
  documents: "Documents the bank asks for",
  checklist: {
    aadhaar: "Aadhaar",
    pan: "PAN card",
    udyam: "Udyam or Udyam Assist certificate",
    business_proof: "Shop licence or other business proof",
    address_proof: "Address proof",
    photos: "Passport photos",
    quotation: "This stock quotation",
    bank_statements: "Bank statements",
  },
  status: { have: "Have", missing: "Missing", bring: "Bring" },
  scheme: "Scheme",
  noNames: "No customer names or phone numbers are in this pack.",
};

const ta: PaperText = {
  statement: "கடை அறிக்கை",
  period: (from, to) => `${from} முதல் ${to} வரை`,
  madeOn: (date) => `${date} அன்று தயாரித்தது`,
  demoNote: "டெமோ தரவு: இந்தப் பக்கத்தின் எல்லா எண்களும் டெமோவுக்காகச் சேர்த்தவை.",
  print: "அச்சிடு அல்லது PDF ஆகச் சேமி",
  intro:
    "இரண்டு பகுதிகள், ஒருபோதும் கூட்டப்படாது. ஒவ்வொரு எண்ணுக்கும் அதன் பலவீனமான மூலத்தின் குறி உண்டு. மொத்தம் மட்டும்: வாடிக்கையாளர் பெயரோ தொலைபேசி எண்ணோ இல்லை.",
  verified: "சரிபார்த்தது",
  verifiedText: "பணம் செலுத்தும் நிறுவனமோ சப்ளையர் பில்லோ காட்டுவது.",
  declared: "சொன்னது",
  declaredText: "உரிமையாளர் சொன்னதும், அதிலிருந்து கணக்கிட்ட மதிப்பீடுகளும்.",
  metrics: {
    digitalPayments: "வந்த டிஜிட்டல் பணம்",
    creditRecoveredByLink: "லிங்க் மூலம் திரும்ப வந்த கடன்",
    supplierBills: "சப்ளையர் பில்களில் வாங்கியது",
    cashSales: "ரொக்க விற்பனை",
    creditGiven: "கொடுத்த கடன்",
    creditRecoveredCash: "ரொக்கமாகத் திரும்ப வந்த கடன்",
    billsPaidOnTime: "நேரத்தில் கட்டிய சப்ளையர் பில்கள்",
    regularCreditCustomers: "வழக்கமான கடன் வாடிக்கையாளர்கள்",
    averageStockValue: "சராசரி சரக்கு மதிப்பு, வாங்கிய விலையில்",
    moneyCycleDays: "பணச் சுழற்சி",
  },
  bills: (count) => `${count} பில்கள்`,
  medianDays: (days) => `வழக்கமாக ${days} நாளில் திரும்ப வந்தது`,
  percentOf: (percent, bills) => `${bills}-ல் ${percent}%`,
  customers: (count) => `${count} பேர்`,
  days: (days) => `${days} நாள்`,
  notEnough: "போதிய பதிவுகள் இல்லை",
  seeRows: (count) => `இதன் பின்னுள்ள ${count} பதிவுகள்`,
  paidLate: "தாமதமாகக் கட்டியது",
  paidOnTime: "நேரத்தில்",
  monthEnd: "மாத இறுதி",
  footer:
    "கடையின் சொந்தப் பதிவுகளிலிருந்து தயாரித்தது. யார் பார்க்கலாம் என்பதை உரிமையாளர் முடிவு செய்வார்.",
  loanPack: "கடன் ஆவணத் தொகுப்பு",
  loanFor: "எதற்காக",
  loanNeeded: "தேவையான கடன்",
  workedOut: "கடையின் சொந்தக் கணக்கிலிருந்து கணக்கிட்டது",
  quotation: "சரக்கு விலைப்பட்டியல்",
  quotationFrom: (festival, distributor) =>
    `${distributor}-இடம் ${festival} ஆர்டர், சப்ளையர் பில் விலையில்`,
  columns: { item: "பொருள்", qty: "அளவு", rate: "விலை", amount: "தொகை" },
  total: "மொத்தம்",
  documents: "வங்கி கேட்கும் ஆவணங்கள்",
  checklist: {
    aadhaar: "ஆதார்",
    pan: "PAN அட்டை",
    udyam: "உத்யம் அல்லது உத்யம் அசிஸ்ட் சான்றிதழ்",
    business_proof: "கடை உரிமம் அல்லது வேறு வணிகச் சான்று",
    address_proof: "முகவரிச் சான்று",
    photos: "பாஸ்போர்ட் புகைப்படங்கள்",
    quotation: "இந்தச் சரக்கு விலைப்பட்டியல்",
    bank_statements: "வங்கி அறிக்கைகள்",
  },
  status: { have: "உள்ளது", missing: "இல்லை", bring: "எடுத்து வாருங்கள்" },
  scheme: "திட்டம்",
  noNames: "இந்தத் தொகுப்பில் வாடிக்கையாளர் பெயரோ தொலைபேசி எண்ணோ இல்லை.",
};

export function paperTextFor(lang: PaperLang): PaperText {
  return lang === "ta" ? ta : en;
}

/** ?lang=ta gives Tamil; anything else, English. */
export function paperLang(value: string | string[] | undefined): PaperLang {
  return value === "ta" ? "ta" : "en";
}

// Government scheme facts for the loan-ready check (spec section 10, rule 9). Only facts written
// in the spec go here, each with its official source and the day we checked it. Nothing else
// about schemes may appear on screen.

export const CHECKED_ON = "2026-10-17";

export type Link = { label: string; url: string };

const RUPEE = 100;
const LAKH = 100_000 * RUPEE;

/** PM Mudra Yojana bands, in paise. Tarun Plus is only for those who repaid a Tarun loan. */
export const mudraBands = [
  {
    key: "shishu",
    name: "Shishu",
    fromPaise: 0,
    upToPaise: 50_000 * RUPEE,
    range: "up to ₹50,000",
  },
  {
    key: "kishore",
    name: "Kishore",
    fromPaise: 50_000 * RUPEE,
    upToPaise: 5 * LAKH,
    range: "above ₹50,000, up to ₹5 lakh",
  },
  {
    key: "tarun",
    name: "Tarun",
    fromPaise: 5 * LAKH,
    upToPaise: 10 * LAKH,
    range: "above ₹5 lakh, up to ₹10 lakh",
  },
  {
    key: "tarun_plus",
    name: "Tarun Plus",
    fromPaise: 10 * LAKH,
    upToPaise: 20 * LAKH,
    range: "₹10 lakh to ₹20 lakh, after repaying a Tarun loan",
  },
] as const;

export type MudraBandKey = (typeof mudraBands)[number]["key"];

export const mudra = {
  name: "PM Mudra Yojana (PMMY)",
  fits: "Covers vendors, traders and shopkeepers, for a term loan or working capital.",
  noCollateral: true,
  interest: "Set by the bank.",
  applyAt:
    "Any bank, regional rural bank, small finance bank, NBFC or MFI, or online on JanSamarth.",
  links: [
    {
      label: "Department of Financial Services",
      url: "https://financialservices.gov.in/pradhan-mantri-mudra-yojana-pmmy",
    },
    { label: "PIB, April 2026", url: "https://www.pib.gov.in/PressReleasePage.aspx?PRID=2249942" },
    {
      label: "Bank of Baroda",
      url: "https://bankofbaroda.bank.in/loans/pradhan-mantri-mudra-yojana",
    },
  ] satisfies Link[],
};

/** Why the bank can lend without collateral. */
export const cgfmu = {
  name: "CGFMU guarantee",
  fact: "Mudra loans up to ₹20 lakh are guaranteed for the lender, so the bank asks for no collateral.",
  links: [
    {
      label: "NCGTC FAQ, February 2025",
      url: "https://www.ncgtc.in/content/products/0/20250218/FAQ_updated_18_Feb_2025_9bf9bacc83.pdf",
    },
  ] satisfies Link[],
};

export const udyam = {
  name: "Udyam Registration",
  fact: "Free, only on udyamregistration.gov.in. Needs Aadhaar and PAN; GSTIN only if you have one.",
  links: [
    { label: "Udyam Registration portal", url: "https://udyamregistration.gov.in/" },
    {
      label: "RBI, July 2021",
      url: "https://rbi.org.in/Scripts/BS_CircularIndexDisplay.aspx?Id=12126",
    },
  ] satisfies Link[],
};

export const udyamAssist = {
  name: "Udyam Assist Platform",
  fact: "For shops without PAN or GST: your bank creates the certificate online, with no PAN or GSTIN needed.",
  links: [
    {
      label: "RBI, May 2023",
      url: "https://www.rbi.org.in/Scripts/NotificationUser.aspx?Id=12500",
    },
    { label: "SIDBI", url: "https://www.sidbi.in/en/udyam-assist-platform" },
  ] satisfies Link[],
};

export const janSamarth = {
  name: "JanSamarth",
  fact: "The official place to apply online for Mudra.",
  links: [
    { label: "PIB, June 2026", url: "https://www.pib.gov.in/PressReleasePage.aspx?PRID=2269253" },
  ] satisfies Link[],
};

/** Which loan form to ask for, by purpose (spec section 10, v4.1). */
export const loanForms = {
  stock_rotation: {
    line: "Ask for working capital as a cash credit limit with a RuPay MUDRA card.",
    why: "You can withdraw and pay back many times within the limit, so repayment follows your daily takings.",
    links: [
      {
        label: "IDBI Bank: RuPay MUDRA card",
        url: "https://www.idbi.bank.in/rupay-mudra-debit-card.aspx",
      },
      {
        label: "RuPay: MUDRA card",
        url: "https://rupay.co.in/our-cards/rupay-debit/government-scheme/rupay-mudra-card",
      },
    ] satisfies Link[],
  },
  equipment: {
    line: "Ask for a term loan with a fixed EMI.",
    why: "The EMI then shows in your week ahead as a due, like a bill.",
    links: [] satisfies Link[],
  },
} as const;

export type LoanPurpose = keyof typeof loanForms;

/** Shown with every loan-ready answer and every pack. */
export const fixedLines = [
  "The bank decides; we do not promise approval.",
  "Applying for Mudra or Udyam costs nothing. Anyone asking you for a fee is not the government.",
] as const;

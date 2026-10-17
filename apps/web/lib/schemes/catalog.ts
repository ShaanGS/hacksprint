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

const tamil = {
  mudraName: "பிரதமர் முத்ரா திட்டம் (PMMY)",
  bands: {
    shishu: { name: "ஷிஷு", range: "₹50,000 வரை" },
    kishore: { name: "கிஷோர்", range: "₹50,000-க்கு மேல், ₹5 லட்சம் வரை" },
    tarun: { name: "தருண்", range: "₹5 லட்சத்துக்கு மேல், ₹10 லட்சம் வரை" },
    tarun_plus: {
      name: "தருண் பிளஸ்",
      range: "₹10 லட்சம் முதல் ₹20 லட்சம் வரை, தருண் கடனைத் திருப்பிச் செலுத்திய பிறகு",
    },
  },
  noCollateral: "அடமானம் தேவையில்லை.",
  aboveMudra: "இது முத்ரா வரம்பை (₹20 லட்சம் வரை) விட அதிகம்.",
  needsTarunRepaid: "தருண் கடனைத் திருப்பிச் செலுத்திய பிறகுதான் தருண் பிளஸ் கிடைக்கும்.",
  interest: "வட்டியை வங்கி முடிவு செய்யும்.",
  applyAt:
    "எந்த வங்கி, மண்டல ஊரக வங்கி, சிறு நிதி வங்கி, NBFC அல்லது MFI-யிலும், அல்லது JanSamarth இணையதளத்திலும் விண்ணப்பிக்கலாம்.",
  udyam:
    "இலவசம், udyamregistration.gov.in-ல் மட்டும். ஆதார், PAN தேவை; GSTIN இருந்தால் மட்டும் கொடுங்கள்.",
  udyamAssist:
    "PAN அல்லது GST இல்லாத கடைகளுக்கு: உங்கள் வங்கியே சான்றிதழை இணையத்தில் உருவாக்கும்; PAN, GSTIN தேவையில்லை.",
  loanForms: {
    stock_rotation: {
      line: "RuPay MUDRA அட்டையுடன் கேஷ் கிரெடிட் வரம்பாக நடைமுறை மூலதனம் கேளுங்கள்.",
      why: "வரம்புக்குள் பலமுறை எடுக்கவும் திருப்பிக் கட்டவும் முடியும்; அதனால் திருப்பிச் செலுத்துவது உங்கள் தினசரி வருமானத்தோடு ஒத்துப்போகும்.",
    },
    equipment: {
      line: "நிலையான EMI உள்ள கால கடன் கேளுங்கள்.",
      why: "அப்போது அந்த EMI ஒரு பில் போல உங்கள் வரும் வாரத்தில் கட்ட வேண்டியதாகத் தெரியும்.",
    },
  },
  fixedLines: [
    "வங்கியே முடிவு செய்யும்; கடன் கிடைக்கும் என்று நாங்கள் உறுதி தரவில்லை.",
    "முத்ரா அல்லது உத்யம் விண்ணப்பத்துக்குக் கட்டணம் இல்லை. கட்டணம் கேட்பவர் அரசு அல்ல.",
  ],
} as const;

export type SchemeLang = "en" | "ta";

/**
 * The facts above in the reader's language, for the owner's screens and the printed pages. The
 * Tamil says what the English says, no more.
 */
export function schemeWords(lang: SchemeLang) {
  if (lang === "ta") {
    return {
      mudraName: tamil.mudraName,
      band: (key: MudraBandKey) => tamil.bands[key],
      noCollateral: tamil.noCollateral,
      notCovered: (reason: "needs_tarun_repaid" | "above_mudra") =>
        reason === "above_mudra" ? tamil.aboveMudra : tamil.needsTarunRepaid,
      interest: tamil.interest,
      applyAt: tamil.applyAt,
      udyam: tamil.udyam,
      udyamAssist: tamil.udyamAssist,
      loanForm: (purpose: LoanPurpose) => tamil.loanForms[purpose],
      fixedLines: tamil.fixedLines,
    };
  }
  return {
    mudraName: mudra.name,
    band: (key: MudraBandKey) => {
      const band = mudraBands.find((b) => b.key === key) ?? mudraBands[0];
      return { name: band.name, range: band.range };
    },
    noCollateral: "No collateral.",
    notCovered: (reason: "needs_tarun_repaid" | "above_mudra") =>
      reason === "above_mudra"
        ? "This is more than Mudra covers (up to ₹20 lakh)."
        : "Tarun Plus is only for those who repaid a Tarun loan.",
    interest: mudra.interest,
    applyAt: mudra.applyAt,
    udyam: udyam.fact,
    udyamAssist: udyamAssist.fact,
    loanForm: (purpose: LoanPurpose) => loanForms[purpose],
    fixedLines,
  };
}

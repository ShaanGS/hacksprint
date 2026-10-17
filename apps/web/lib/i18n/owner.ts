import type { Decision } from "@/lib/owner/approval";
import type { Lang } from "@/lib/i18n/languages";
import type { ProductUnit } from "@/lib/orders/quantity";
import type { RejectReason } from "@/lib/orders/state";
import type { HomeSourceKind } from "@/lib/sources/types";

// The owner app's words. The owner reads and hears the shop in their own language (spec A2),
// whatever language the customer ordered in. Tamil is checked by a native speaker before the demo.

export type OwnerText = {
  pinTitle: string;
  pinWrong: string;
  pinLocked: string;
  pinDelete: string;
  morning: string;
  afternoon: string;
  evening: string;
  needsYou: string;
  collected: string;
  onAccount: string;
  paytmLink: string;
  caughtUp: string;
  newCustomer: string;
  owes: (amount: string) => string;
  orderedIn: Record<Lang, string>;
  outOfStockNote: (names: string) => string;
  total: string;
  approve: (amount: string) => string;
  reject: string;
  putOnAccount: string;
  holdToSay: string;
  listening: string;
  working: string;
  heard: (text: string) => string;
  notUnderstood: string;
  micBlocked: string;
  decided: Record<Decision, string>;
  soundOff: string;
  offline: string;
  failed: string;
  whyReject: string;
  reasons: Record<RejectReason, string>;
  rejectOrder: (number: number) => string;
  theySeeReason: (name: string) => string;
  onTheWay: string;
  linkSent: string;
  linkFailed: string;
  retryLink: string;
  waitingPayment: string;
  paid: string;
  readyToDeliver: string;
  markDelivered: string;
  doneToday: (count: number) => string;
  delivered: string;
  rejected: string;
  items: (count: number) => string;
  tabs: { orders: string; stock: string; credit: string; home: string };
  stockSummary: (count: number, low: number, out: number) => string;
  filters: { all: string; low: string; out: string };
  runningLow: string;
  outOfStock: string;
  left: (qty: number, unit: ProductUnit) => string;
  scanTitle: string;
  scanText: string;
  takePhoto: string;
  readingBill: string;
  billUnreadable: string;
  retakePhoto: string;
  checkBill: string;
  billFrom: (distributor: string, number: string | null) => string;
  whichDistributor: string;
  alreadyAdded: (date: string) => string;
  whichProduct: string;
  onTheBill: (name: string) => string;
  lineUnreadable: string;
  billSays: (amount: string) => string;
  lessOne: string;
  moreOne: string;
  leaveOut: string;
  putBack: string;
  addToStock: (amount: string) => string;
  addedTitle: string;
  addedText: (amount: string, distributor: string) => string;
  missingTitle: string;
  orderedGot: (ordered: number, got: number) => string;
  priceUpTitle: string;
  priceUp: (before: string, now: string, percent: number) => string;
  allCame: string;
  stockNow: (added: string, now: string) => string;
  done: string;
  savedTitle: string;
  savedText: (count: number) => string;
  seeWhere: string;
  collectedToday: string;
  owedToShop: string;
  owedByShop: string;
  sourceTitles: Record<HomeSourceKind, string>;
  addsUpTo: string;
  due: (date: string) => string;
  reference: (ref: string) => string;
  priceTitle: string;
  priceOnBill: (mrp: string) => string;
  youPaid: (cost: string) => string;
  noBill: string;
  nothingYet: string;
  /** What the phone says when an order arrives. */
  announce: (customer: string, items: string, total: string) => string;
};

const en: OwnerText = {
  pinTitle: "Enter the shop PIN",
  pinWrong: "That PIN is wrong",
  pinLocked: "Too many tries. Wait 30 seconds.",
  pinDelete: "Delete",
  morning: "Good morning",
  afternoon: "Good afternoon",
  evening: "Good evening",
  needsYou: "Needs you",
  collected: "Collected",
  onAccount: "On account",
  paytmLink: "Paytm link",
  caughtUp: "All caught up. New orders appear here.",
  newCustomer: "New",
  owes: (amount) => `Owes ${amount}`,
  orderedIn: {
    ta: "Ordered in Tamil",
    hi: "Ordered in Hindi",
    kn: "Ordered in Kannada",
    en: "Ordered in English",
  },
  outOfStockNote: (names) => `${names} out of stock`,
  total: "Total",
  approve: (amount) => `Approve ${amount}`,
  reject: "Reject",
  putOnAccount: "Put on account",
  holdToSay: 'Hold and say "seri"',
  listening: "Listening, let go to send",
  working: "One moment",
  heard: (text) => `Heard "${text}"`,
  notUnderstood: 'Say "seri" to approve, "venda" to reject, or "kanakku" for on account',
  micBlocked: "Allow the microphone to approve by voice",
  decided: { approve: "Approved", reject: "Rejected", credit: "Put on account" },
  soundOff: "Tap to turn on order sounds",
  offline: "No connection. Trying again…",
  failed: "That did not go through. Try again.",
  whyReject: "Why can't you take it?",
  reasons: {
    out_of_stock: "Items are out of stock",
    shop_closed: "The shop is closed",
    cannot_deliver: "Can't deliver right now",
    other: "Something else",
  },
  rejectOrder: (number) => `Reject order #${number}`,
  theySeeReason: (name) => `${name} sees the reason in their language.`,
  onTheWay: "On the way",
  linkSent: "Link sent",
  linkFailed: "Link failed",
  retryLink: "Try the link again",
  waitingPayment: "Waiting for payment",
  paid: "Paid",
  readyToDeliver: "Ready to deliver",
  markDelivered: "Mark delivered",
  doneToday: (count) => `Done today (${count})`,
  delivered: "Delivered",
  rejected: "Rejected",
  items: (count) => (count === 1 ? "1 item" : `${count} items`),
  tabs: { orders: "Orders", stock: "Stock", credit: "Credit", home: "Home" },
  stockSummary: (count, low, out) => `${count} products · ${low} running low · ${out} out`,
  filters: { all: "All", low: "Running low", out: "Out" },
  runningLow: "Running low",
  outOfStock: "Out of stock",
  left: (qty, unit) =>
    unit === "kg" || unit === "litre"
      ? `${qty} ${unit} left`
      : `${qty} ${unit === "piece" ? "" : qty === 1 ? "pack " : "packs "}left`,
  scanTitle: "Today's delivery",
  scanText: "Photograph the bill. Stock, prices and what you owe update themselves.",
  takePhoto: "Take a photo of the bill",
  readingBill: "Reading the bill…",
  billUnreadable: "The bill could not be read. Take the photo again with the whole bill in view.",
  retakePhoto: "Take another photo",
  checkBill: "Check the bill",
  billFrom: (distributor, number) => (number ? `${distributor} · Bill ${number}` : distributor),
  whichDistributor: "Which distributor is it from?",
  alreadyAdded: (date) =>
    `This bill was added on ${date}. Adding it again would count the stock twice.`,
  whichProduct: "Which product?",
  onTheBill: (name) => `On the bill: ${name}`,
  lineUnreadable: "This line could not be read",
  billSays: (amount) => `The bill says ${amount}`,
  lessOne: "One less",
  moreOne: "One more",
  leaveOut: "Leave out",
  putBack: "Put back",
  addToStock: (amount) => `Add ${amount} to stock`,
  addedTitle: "Added to stock",
  addedText: (amount, distributor) => `${amount} bill from ${distributor}`,
  missingTitle: "Not in the delivery",
  orderedGot: (ordered, got) => `Ordered ${ordered}, came ${got}`,
  priceUpTitle: "Price went up",
  priceUp: (before, now, percent) => `${before} → ${now}, up ${percent}% since the last bill`,
  allCame: "Everything you ordered came, at the same price.",
  stockNow: (added, now) => `+${added}, now ${now}`,
  done: "Done",
  savedTitle: "Saved while you were busy",
  savedText: (count) =>
    count === 1 ? "1 order taken by voice today" : `${count} orders taken by voice today`,
  seeWhere: "Tap a number to see where it comes from",
  collectedToday: "Collected today",
  owedToShop: "Customers owe you",
  owedByShop: "You owe distributors",
  sourceTitles: {
    orders: "Orders taken today",
    collected: "Payments today",
    "owed-to-shop": "Who owes you",
    "owed-by-shop": "Bills to pay",
  },
  addsUpTo: "Adds up to",
  due: (date) => `Due ${date}`,
  reference: (ref) => `Ref ${ref}`,
  priceTitle: "Where this price comes from",
  priceOnBill: (mrp) => `${mrp} is the MRP printed on this bill`,
  youPaid: (cost) => `You paid ${cost}`,
  noBill: "No bill has set this price yet.",
  nothingYet: "Nothing yet today.",
  announce: (customer, items, total) =>
    `New order from ${customer}: ${items}. Total ${total}. Approve?`,
};

const ta: OwnerText = {
  pinTitle: "கடை PIN-ஐ உள்ளிடுங்கள்",
  pinWrong: "PIN தவறு",
  pinLocked: "பல முறை தவறு. 30 வினாடி காத்திருங்கள்.",
  pinDelete: "அழி",
  morning: "காலை வணக்கம்",
  afternoon: "மதிய வணக்கம்",
  evening: "மாலை வணக்கம்",
  needsYou: "உங்கள் முடிவு தேவை",
  collected: "வசூல்",
  onAccount: "கணக்கில்",
  paytmLink: "Paytm லிங்க்",
  caughtUp: "எல்லாம் முடிந்தது. புதிய ஆர்டர்கள் இங்கே வரும்.",
  newCustomer: "புதியவர்",
  owes: (amount) => `நிலுவை ${amount}`,
  orderedIn: {
    ta: "தமிழில் ஆர்டர்",
    hi: "இந்தியில் ஆர்டர்",
    kn: "கன்னடத்தில் ஆர்டர்",
    en: "ஆங்கிலத்தில் ஆர்டர்",
  },
  outOfStockNote: (names) => `${names} தீர்ந்துவிட்டது`,
  total: "மொத்தம்",
  approve: (amount) => `${amount} ஏற்கவும்`,
  reject: "மறுக்கவும்",
  putOnAccount: "கணக்கில் எழுதவும்",
  holdToSay: "அழுத்திப் பிடித்து “சரி” சொல்லுங்கள்",
  listening: "கேட்கிறது…",
  working: "ஒரு நொடி…",
  heard: (text) => `கேட்டது: “${text}”`,
  notUnderstood: "ஏற்க “சரி”, மறுக்க “வேண்டாம்”, கணக்கில் எழுத “கணக்கு” சொல்லுங்கள்",
  micBlocked: "குரலில் ஏற்க, மைக்கை அனுமதியுங்கள்",
  decided: { approve: "ஏற்கப்பட்டது", reject: "மறுக்கப்பட்டது", credit: "கணக்கில் எழுதப்பட்டது" },
  soundOff: "ஆர்டர் ஒலியை இயக்க இங்கே தட்டுங்கள்",
  offline: "இணைப்பு இல்லை. மீண்டும் முயல்கிறது…",
  failed: "அது நடக்கவில்லை. மீண்டும் முயலுங்கள்.",
  whyReject: "ஏன் எடுக்க முடியவில்லை?",
  reasons: {
    out_of_stock: "பொருட்கள் தீர்ந்துவிட்டன",
    shop_closed: "கடை மூடியுள்ளது",
    cannot_deliver: "இப்போது டெலிவரி முடியாது",
    other: "வேறு காரணம்",
  },
  rejectOrder: (number) => `ஆர்டர் #${number} மறுக்கவும்`,
  theySeeReason: (name) => `${name} அவர் மொழியில் காரணத்தைப் பார்ப்பார்.`,
  onTheWay: "நடப்பில் உள்ளவை",
  linkSent: "லிங்க் அனுப்பப்பட்டது",
  linkFailed: "லிங்க் வரவில்லை",
  retryLink: "மீண்டும் லிங்க் அனுப்பு",
  waitingPayment: "பணத்திற்காகக் காத்திருக்கிறது",
  paid: "பணம் வந்தது",
  readyToDeliver: "டெலிவரிக்குத் தயார்",
  markDelivered: "டெலிவரி ஆனது",
  doneToday: (count) => `இன்று முடிந்தவை (${count})`,
  delivered: "டெலிவரி ஆனது",
  rejected: "மறுக்கப்பட்டது",
  items: (count) => (count === 1 ? "1 பொருள்" : `${count} பொருட்கள்`),
  tabs: { orders: "ஆர்டர்கள்", stock: "சரக்கு", credit: "கடன்", home: "முகப்பு" },
  stockSummary: (count, low, out) => `${count} பொருட்கள் · ${low} குறைவு · ${out} தீர்ந்தது`,
  filters: { all: "அனைத்தும்", low: "குறைவு", out: "தீர்ந்தது" },
  runningLow: "குறைவாக உள்ளது",
  outOfStock: "தீர்ந்துவிட்டது",
  left: (qty, unit) =>
    unit === "kg"
      ? `${qty} கிலோ மீதம்`
      : unit === "litre"
        ? `${qty} லிட்டர் மீதம்`
        : `${qty} மீதம்`,
  scanTitle: "இன்றைய டெலிவரி",
  scanText: "பில்லை போட்டோ எடுங்கள். சரக்கு, விலை, கொடுக்க வேண்டியது தானாக மாறும்.",
  takePhoto: "பில்லை போட்டோ எடுங்கள்",
  readingBill: "பில்லைப் படிக்கிறது…",
  billUnreadable: "பில்லைப் படிக்க முடியவில்லை. முழு பில்லும் தெரியும்படி மீண்டும் எடுங்கள்.",
  retakePhoto: "மீண்டும் போட்டோ எடுங்கள்",
  checkBill: "பில்லைச் சரிபாருங்கள்",
  billFrom: (distributor, number) => (number ? `${distributor} · பில் ${number}` : distributor),
  whichDistributor: "இது எந்த விநியோகஸ்தரிடமிருந்து?",
  alreadyAdded: (date) =>
    `இந்த பில் ${date} அன்றே சேர்க்கப்பட்டது. மீண்டும் சேர்த்தால் சரக்கு இரண்டு முறை கூடும்.`,
  whichProduct: "எந்தப் பொருள்?",
  onTheBill: (name) => `பில்லில்: ${name}`,
  lineUnreadable: "இந்த வரியைப் படிக்க முடியவில்லை",
  billSays: (amount) => `பில்லில் ${amount}`,
  lessOne: "ஒன்று குறை",
  moreOne: "ஒன்று கூட்டு",
  leaveOut: "விடு",
  putBack: "மீண்டும் சேர்",
  addToStock: (amount) => `${amount} சரக்கில் சேர்`,
  addedTitle: "சரக்கில் சேர்க்கப்பட்டது",
  addedText: (amount, distributor) => `${distributor} பில் ${amount}`,
  missingTitle: "டெலிவரியில் வரவில்லை",
  orderedGot: (ordered, got) => `ஆர்டர் ${ordered}, வந்தது ${got}`,
  priceUpTitle: "விலை ஏறியது",
  priceUp: (before, now, percent) => `${before} → ${now}, கடந்த பில்லை விட ${percent}% அதிகம்`,
  allCame: "ஆர்டர் செய்த அனைத்தும் அதே விலையில் வந்தது.",
  stockNow: (added, now) => `+${added}, இப்போது ${now}`,
  done: "முடிந்தது",
  savedTitle: "நீங்கள் பிஸியாக இருந்தபோது வந்தவை",
  savedText: (count) => `இன்று குரலில் வந்த ${count} ஆர்டர்கள்`,
  seeWhere: "எண்ணைத் தட்டினால் அது எங்கிருந்து வந்தது என்று தெரியும்",
  collectedToday: "இன்று வசூல்",
  owedToShop: "வர வேண்டியது",
  owedByShop: "கொடுக்க வேண்டியது",
  sourceTitles: {
    orders: "இன்றைய ஆர்டர்கள்",
    collected: "இன்று வந்த பணம்",
    "owed-to-shop": "யார் தர வேண்டும்",
    "owed-by-shop": "செலுத்த வேண்டிய பில்கள்",
  },
  addsUpTo: "மொத்தம்",
  due: (date) => `கடைசி நாள் ${date}`,
  reference: (ref) => `குறிப்பு ${ref}`,
  priceTitle: "இந்த விலை எங்கிருந்து",
  priceOnBill: (mrp) => `${mrp} — இந்த பில்லில் அச்சிட்ட MRP`,
  youPaid: (cost) => `நீங்கள் கொடுத்தது ${cost}`,
  noBill: "இந்த விலைக்கு இன்னும் பில் இல்லை.",
  nothingYet: "இன்று இதுவரை எதுவும் இல்லை.",
  announce: (customer, items, total) =>
    `${customer} புதிய ஆர்டர்: ${items}. மொத்தம் ${total}. ஏற்கலாமா?`,
};

const texts: Partial<Record<Lang, OwnerText>> = { en, ta };

/** The owner app's words in the owner's language; English where we have no translation yet. */
export function ownerTextFor(lang: Lang): OwnerText {
  return texts[lang] ?? en;
}

import type { Decision } from "@/lib/owner/approval";
import type { Lang } from "@/lib/i18n/languages";
import type { RejectReason } from "@/lib/orders/state";

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
  tabs: { orders: string; stock: string; credit: string; today: string };
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
  tabs: { orders: "Orders", stock: "Stock", credit: "Credit", today: "Today" },
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
  tabs: { orders: "ஆர்டர்கள்", stock: "சரக்கு", credit: "கடன்", today: "இன்று" },
  announce: (customer, items, total) =>
    `${customer} புதிய ஆர்டர்: ${items}. மொத்தம் ${total}. ஏற்கலாமா?`,
};

const texts: Partial<Record<Lang, OwnerText>> = { en, ta };

/** The owner app's words in the owner's language; English where we have no translation yet. */
export function ownerTextFor(lang: Lang): OwnerText {
  return texts[lang] ?? en;
}

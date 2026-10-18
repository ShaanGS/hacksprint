import type { Lang } from "@/lib/i18n/languages";

// The agents' words, in Tamil and English: the collection agent (A3 to A5 done for him) and the
// reorder agent. Amounts arrive already formatted; every number comes from code.

type Money = string;

export type AgentWords = {
  letAgent: string;
  letAgentCollect: string;
  collectHint: string;
  collectTitle: string;
  collectSteps: { found: string; wrote: string; send: string; watch: string };
  found: (count: number, amount: Money) => string;
  nobodyLate: string;
  wrote: (done: number, total: number, paytm: boolean) => string;
  sendHint: string;
  send: string;
  sent: string;
  paid: (amount: Money) => string;
  received: (amount: Money) => string;
  waiting: string;
  verifiedBy: (paytm: boolean) => string;
  showQr: string;
  scanToPay: (amount: Money) => string;
  qrNote: (paytm: boolean) => string;
  letAgentReorder: string;
  reorderTitle: string;
  reorderSteps: { shelf: string; skipped: string; bills: string; approve: string; sent: string };
  runsOut: (count: number) => string;
  leftOut: (slow: number, stuck: Money, lasting: number) => string;
  fromBills: string;
  approveHint: string;
  sendTo: (distributor: string) => string;
  sentTo: (distributor: string) => string;
  nothingToOrder: string;
  couldNotSend: string;
  payTest: (amount: Money) => string;
  openPayment: string;
  paidTest: (amount: Money) => string;
  testNote: string;
  voiceTitle: string;
  listening: string;
  working: string;
  trySaying: string;
  example: string;
  letGo: string;
};

const en: AgentWords = {
  letAgent: "Let the agent do it",
  letAgentCollect: "Let the agent collect",
  collectHint: "The agent writes each reminder with a payment link. You send it.",
  collectTitle: "Collecting for you",
  collectSteps: {
    found: "Found who is late",
    wrote: "Wrote each reminder",
    send: "Send from your WhatsApp",
    watch: "Watching for payments",
  },
  found: (count, amount) => `${count} late ${count === 1 ? "payer owes" : "payers owe"} ${amount}`,
  nobodyLate: "Nobody is late. There is nothing to collect.",
  wrote: (done, total, paytm) =>
    `${done} of ${total}, each in their own language with a ${paytm ? "Paytm" : "payment"} link`,
  sendHint: "Tap Send: WhatsApp opens with the message, and you press send.",
  send: "Send",
  sent: "Sent",
  paid: (amount) => `${amount} paid`,
  received: (amount) => `${amount} received so far`,
  waiting: "Waiting for the first payment",
  verifiedBy: (paytm) =>
    paytm ? "A payment counts once Paytm confirms it." : "A payment counts once its link is paid.",
  showQr: "Show the QR to pay",
  scanToPay: (amount) => `Scan to pay ${amount}`,
  qrNote: (paytm) =>
    paytm
      ? "Pays the shop through Paytm. The agent marks it the moment it lands."
      : "Test mode: no real money moves. The agent marks it the moment it lands.",
  letAgentReorder: "Let the agent reorder",
  reorderTitle: "Ordering for you",
  reorderSteps: {
    shelf: "Checked the shelf",
    skipped: "Left out slow stock",
    bills: "Quantities from your last bills",
    approve: "Your approval",
    sent: "Sent through n8n",
  },
  runsOut: (count) =>
    count === 0
      ? "Nothing runs out this week."
      : `${count} ${count === 1 ? "item runs" : "items run"} out this week`,
  leftOut: (slow, stuck, lasting) =>
    `${slow} slow ${slow === 1 ? "item" : "items"} left out (${stuck} stuck); ${lasting} others last over a week`,
  fromBills: "Same quantity as the last bill, at that bill's price",
  approveHint: "Nothing is sent until you tap Send.",
  sendTo: (distributor) => `Send to ${distributor}`,
  sentTo: (distributor) => `Emailed to ${distributor} through n8n`,
  nothingToOrder: "Nothing to order. If something looks low, count it by voice first.",
  couldNotSend: "Could not reach n8n. The order was not sent.",
  payTest: (amount) => `Pay ${amount} (test mode)`,
  openPayment: "Open the payment",
  paidTest: (amount) => `${amount} paid in test mode`,
  testNote:
    "Test mode: in a real shop this payment would go to the distributor. Here it goes to a test account, and your numbers do not change.",
  voiceTitle: "Talk to your shop",
  listening: "I'm listening…",
  working: "Working it out…",
  trySaying: "Try saying",
  example: "“Ramesh, 200 rupees credit”",
  letGo: "Let go to send",
};

const ta: AgentWords = {
  letAgent: "முகவர் செய்யட்டும்",
  letAgentCollect: "முகவர் வசூலிக்கட்டும்",
  collectHint:
    "ஒவ்வொரு நினைவூட்டலையும் பணம் செலுத்தும் லிங்க் உடன் முகவர் எழுதும். நீங்கள் அனுப்புங்கள்.",
  collectTitle: "உங்களுக்காக வசூலிக்கிறது",
  collectSteps: {
    found: "தாமதமானவர்களைக் கண்டது",
    wrote: "ஒவ்வொரு நினைவூட்டலும் எழுதியது",
    send: "உங்கள் WhatsApp-இல் அனுப்புங்கள்",
    watch: "பணம் வருவதைப் பார்க்கிறது",
  },
  found: (count, amount) => `${count} பேர் ${amount} தர வேண்டும்`,
  nobodyLate: "யாரும் தாமதமாக இல்லை. வசூலிக்க எதுவும் இல்லை.",
  wrote: (done, total, paytm) =>
    `${total}-இல் ${done}, ஒவ்வொன்றும் அவர்கள் மொழியில், ${paytm ? "Paytm" : "பணம் செலுத்தும்"} லிங்க் உடன்`,
  sendHint: "அனுப்பு என்பதைத் தொடுங்கள்: செய்தியுடன் WhatsApp திறக்கும், நீங்கள் அனுப்புங்கள்.",
  send: "அனுப்பு",
  sent: "அனுப்பியது",
  paid: (amount) => `${amount} செலுத்தினார்`,
  received: (amount) => `இதுவரை ${amount} வந்தது`,
  waiting: "முதல் பணத்துக்குக் காத்திருக்கிறது",
  verifiedBy: (paytm) =>
    paytm
      ? "Paytm உறுதி செய்த பிறகே பணம் கணக்கில் வரும்."
      : "லிங்க் மூலம் செலுத்தியதும் பணம் கணக்கில் வரும்.",
  showQr: "செலுத்த QR காட்டு",
  scanToPay: (amount) => `${amount} செலுத்த ஸ்கேன் செய்யுங்கள்`,
  qrNote: (paytm) =>
    paytm
      ? "Paytm மூலம் கடைக்குப் பணம் வரும். வந்ததும் முகவர் குறித்துக்கொள்ளும்."
      : "சோதனை முறை: உண்மையான பணம் நகராது. செலுத்தியதும் முகவர் குறித்துக்கொள்ளும்.",
  letAgentReorder: "முகவர் ஆர்டர் செய்யட்டும்",
  reorderTitle: "உங்களுக்காக ஆர்டர் செய்கிறது",
  reorderSteps: {
    shelf: "அலமாரியைச் சரிபார்த்தது",
    skipped: "மெதுவாக விற்கும் சரக்கை விட்டது",
    bills: "கடைசி பில்களிலிருந்து அளவு",
    approve: "உங்கள் ஒப்புதல்",
    sent: "n8n வழியாக அனுப்பியது",
  },
  runsOut: (count) =>
    count === 0
      ? "இந்த வாரம் எதுவும் தீராது."
      : `இந்த வாரம் ${count} ${count === 1 ? "பொருள்" : "பொருட்கள்"} தீரும்`,
  leftOut: (slow, stuck, lasting) =>
    `மெதுவாக விற்கும் ${slow} பொருட்களை விட்டது (${stuck} முடங்கியுள்ளது); மற்ற ${lasting} ஒரு வாரத்துக்கு மேல் வரும்`,
  fromBills: "கடைசி பில்லின் அளவு, அதே பில் விலையில்",
  approveHint: "நீங்கள் அனுப்பு என்று தொடும் வரை எதுவும் போகாது.",
  sendTo: (distributor) => `${distributor}-க்கு அனுப்பு`,
  sentTo: (distributor) => `n8n வழியாக ${distributor}-க்கு மின்னஞ்சல் அனுப்பியது`,
  nothingToOrder:
    "ஆர்டர் செய்ய எதுவும் இல்லை. ஏதாவது குறைவாகத் தெரிந்தால், முதலில் குரலில் எண்ணிக்கை சொல்லுங்கள்.",
  couldNotSend: "n8n-ஐ அடைய முடியவில்லை. ஆர்டர் அனுப்பப்படவில்லை.",
  payTest: (amount) => `${amount} செலுத்து (சோதனை)`,
  openPayment: "பணம் செலுத்தும் பக்கத்தைத் திற",
  paidTest: (amount) => `சோதனை முறையில் ${amount} செலுத்தியது`,
  testNote:
    "சோதனை முறை: உண்மையான கடையில் இந்தப் பணம் விநியோகஸ்தருக்குப் போகும். இங்கே சோதனைக் கணக்குக்குப் போகிறது; உங்கள் கணக்கு எண்கள் மாறாது.",
  voiceTitle: "கடையிடம் பேசுங்கள்",
  listening: "கேட்கிறேன்…",
  working: "புரிந்துகொள்கிறேன்…",
  trySaying: "இப்படிச் சொல்லுங்கள்",
  example: "“ரமேஷ், இருநூறு ரூபாய் கடன்”",
  letGo: "அனுப்ப விரலை எடுங்கள்",
};

/** The agents' words in the owner's language; English where we have no translation yet. */
export function agentWordsFor(lang: Lang): AgentWords {
  return lang === "ta" ? ta : en;
}

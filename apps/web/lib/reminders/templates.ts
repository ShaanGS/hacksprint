import type { Lang } from "@/lib/i18n/languages";

// Reminder messages (spec A4, section 14): fixed text per language, written by us, so no model
// and no translation call writes to a customer. The owner sends it from his own WhatsApp.

type Fill = { customer: string; shop: string; amount: string; link: string };

const templates: Record<Lang, (fill: Fill) => string> = {
  en: ({ customer, shop, amount, link }) =>
    `Hello ${customer}, this is ${shop}. ${amount} is due on your account. You can pay here: ${link} Thank you.`,
  ta: ({ customer, shop, amount, link }) =>
    `வணக்கம் ${customer}, ${shop} கடையிலிருந்து. உங்கள் கணக்கில் ${amount} நிலுவையில் உள்ளது. இங்கே செலுத்தலாம்: ${link} நன்றி.`,
  hi: ({ customer, shop, amount, link }) =>
    `नमस्ते ${customer}, ${shop} से। आपके खाते में ${amount} बाकी है। यहाँ भुगतान कर सकते हैं: ${link} धन्यवाद।`,
  kn: ({ customer, shop, amount, link }) =>
    `ನಮಸ್ಕಾರ ${customer}, ${shop} ಅಂಗಡಿಯಿಂದ. ನಿಮ್ಮ ಖಾತೆಯಲ್ಲಿ ${amount} ಬಾಕಿ ಇದೆ. ಇಲ್ಲಿ ಪಾವತಿಸಬಹುದು: ${link} ಧನ್ಯವಾದ.`,
};

export function reminderText(lang: Lang, fill: Fill): string {
  return templates[lang](fill);
}

/** A wa.me link that opens the chat with the message filled in; he presses send himself. */
export function whatsappUrl(phone: string, text: string): string {
  return `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
}

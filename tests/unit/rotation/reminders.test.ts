import { describe, expect, it } from "vitest";
import { langs } from "@/lib/i18n/languages";
import { reminderText, whatsappUrl } from "@/lib/reminders/templates";

const fill = {
  customer: "Arjun Reddy",
  shop: "Lakshmi Stores",
  amount: "₹4,200",
  link: "https://pay.example/l/1",
};

describe("reminders (A4)", () => {
  it("say the amount and carry the payment link in every language", () => {
    for (const lang of langs) {
      const text = reminderText(lang, fill);
      expect(text).toContain("₹4,200");
      expect(text).toContain("https://pay.example/l/1");
      expect(text).toContain("Arjun Reddy");
    }
  });

  it("open WhatsApp on the customer's number with the message filled in", () => {
    const url = whatsappUrl("+91 98765 43210", "₹4,200 & more");
    expect(url).toBe("https://wa.me/919876543210?text=%E2%82%B94%2C200%20%26%20more");
  });
});

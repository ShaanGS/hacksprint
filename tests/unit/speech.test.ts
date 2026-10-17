import { describe, expect, it } from "vitest";
import { looksLikeMoney } from "@/lib/agent/guard";
import { forSpeech, quantityPhrase, readBack } from "@/lib/i18n/speech";

const demoOrder = [
  { name: "Maggi Masala Noodles", qty: 2, unit: "pack" as const },
  { name: "Amul Butter", qty: 1, unit: "pack" as const },
  { name: "Jaggery", qty: 0.5, unit: "kg" as const },
];

describe("read-back built by code", () => {
  it("says loose quantities in words", () => {
    expect(quantityPhrase(0.5, "kg", "ta")).toBe("அரை கிலோ");
    expect(quantityPhrase(0.25, "kg", "hi")).toBe("पाव किलो");
    expect(quantityPhrase(1.5, "litre", "kn")).toBe("1.5 ಲೀಟರ್");
    expect(quantityPhrase(2, "pack", "en")).toBe("2");
  });

  it("reads the demo order back in Tamil with the server total", () => {
    expect(readBack(demoOrder, 12100, "ta")).toBe(
      "2 Maggi Masala Noodles, 1 Amul Butter, அரை கிலோ Jaggery. மொத்தம் ₹121.",
    );
  });

  it("turns rupee amounts into words for the speech engine", () => {
    expect(forSpeech("மொத்தம் ₹1,240.", "ta")).toBe("மொத்தம் 1240 ரூபாய்.");
    expect(forSpeech("Total ₹23.50", "en")).toBe("Total 23.50 rupees");
    expect(forSpeech("Order #42", "en")).toBe("Order 42");
  });
});

describe("money guard on model replies", () => {
  it("lets ordinary replies through", () => {
    expect(looksLikeMoney("Added 2 Maggi. Anything else?")).toBe(false);
    expect(looksLikeMoney("சர்க்கரை தீர்ந்துவிட்டது. வெல்லம் வேண்டுமா?")).toBe(false);
  });

  it("catches money in any of the four languages", () => {
    expect(looksLikeMoney("That will be ₹120")).toBe(true);
    expect(looksLikeMoney("Total 120 rupees")).toBe(true);
    expect(looksLikeMoney("மொத்தம் 120 ரூபாய்")).toBe(true);
    expect(looksLikeMoney("कुल 120 रुपये")).toBe(true);
    expect(looksLikeMoney("ಒಟ್ಟು 120 ರೂಪಾಯಿ")).toBe(true);
  });

  it("catches numbers too big to be a quantity", () => {
    expect(looksLikeMoney("That comes to 121")).toBe(true);
    expect(looksLikeMoney("Only 45 left")).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { formatMoney } from "@/lib/money";

describe("formatMoney (takes paise)", () => {
  it("shows whole rupees without decimals", () => {
    expect(formatMoney(1400)).toBe("₹14");
  });

  it("groups digits the Indian way", () => {
    expect(formatMoney(124000)).toBe("₹1,240");
    expect(formatMoney(12345600)).toBe("₹1,23,456");
  });

  it("keeps paise when there are any", () => {
    expect(formatMoney(2350)).toBe("₹23.50");
    expect(formatMoney(2999)).toBe("₹29.99");
  });

  it("puts a minus sign before the rupee symbol", () => {
    expect(formatMoney(-50000)).toBe("-₹500");
  });
});

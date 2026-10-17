import { describe, expect, it } from "vitest";
import { upiAmount, upiPayUrl } from "@/lib/bill-pay/upi";

describe("the UPI link for a bill", () => {
  it("writes the amount in rupees with two decimals, from paise", () => {
    expect(upiAmount(1_400_000)).toBe("14000.00");
    expect(upiAmount(2_350)).toBe("23.50");
    expect(upiAmount(5)).toBe("0.05");
  });

  it("opens the owner's UPI app with the payee, amount and bill number", () => {
    expect(
      upiPayUrl({
        upiId: "murugantraders.demo@example",
        payee: "Murugan Traders",
        amountPaise: 1_400_000,
        billNumber: "MT-140",
      }),
    ).toBe(
      "upi://pay?pa=murugantraders.demo@example&pn=Murugan%20Traders&am=14000.00&cu=INR&tn=MT-140",
    );
  });

  it("leaves the note out when the bill has no number, and encodes what could break the link", () => {
    expect(
      upiPayUrl({ upiId: "sri@example", payee: "Sri & Sons", amountPaise: 100, billNumber: null }),
    ).toBe("upi://pay?pa=sri@example&pn=Sri%20%26%20Sons&am=1.00&cu=INR");
  });
});

import { describe, expect, it } from "vitest";
import { signPaytm, verifyPaytm } from "@/lib/paytm/checksum";
import { linkIdOf } from "@/app/api/webhooks/paytm/route";
import { buildCreateLinkBody, successfulPayment } from "@/lib/paytm/client";

// No known-answer test vector exists for Paytm's checksum. As of 2026-10-05:
// - Paytm's docs (paytmpayments.com/docs/checksum and /checksum-implementation) show only
//   placeholder keys, and don't even state the algorithm.
// - The official sample code in all nine github.com/paytm/Paytm_*_Checksum repositories
//   (Node, Java, PHP, Python, Ruby, Perl, Go, .NET) signs with "YOUR_MERCHANT_KEY" and a random salt.
// These tests therefore prove only that our code agrees with itself and with Paytm's documented
// signature length. The only real verification is `pnpm smoke paytm`: Paytm staging rejects a
// wrong signature with result code 5028.
const MERCHANT_KEY = "TestMerchantKey1"; // any 16 characters; not a real key
const BODY = JSON.stringify({ mid: "TestMid", linkType: "FIXED", amount: 1 });

describe("paytm checksum (self-consistency only)", () => {
  it("verifies its own signature", () => {
    expect(verifyPaytm(BODY, MERCHANT_KEY, signPaytm(BODY, MERCHANT_KEY))).toBe(true);
  });

  it("has the 108-character length Paytm documents for signatures", () => {
    // 64 hex characters of hash + 4 of salt pad to 80 bytes, which is 107 base64 characters and one "=".
    expect(signPaytm(BODY, MERCHANT_KEY)).toMatch(/^[A-Za-z0-9+/]{107}=$/);
  });

  it("differs on every call because of the random salt", () => {
    expect(signPaytm(BODY, MERCHANT_KEY)).not.toBe(signPaytm(BODY, MERCHANT_KEY));
  });

  it("rejects a signature over different data", () => {
    const signature = signPaytm(BODY, MERCHANT_KEY);
    expect(verifyPaytm(BODY.replace('"amount":1', '"amount":100'), MERCHANT_KEY, signature)).toBe(
      false,
    );
  });

  it("rejects a signature made with another key", () => {
    const signature = signPaytm(BODY, "AnotherMerchant1");
    expect(verifyPaytm(BODY, MERCHANT_KEY, signature)).toBe(false);
  });
});

describe("create link request body", () => {
  it("sends rupees as a number, for one payment, with no SMS or email", () => {
    const body = buildCreateLinkBody("TestMid", {
      amountPaise: 2350,
      linkName: "Order1042",
      description: "Lakshmi Stores order",
    });

    expect(body).toEqual({
      mid: "TestMid",
      linkType: "FIXED",
      linkName: "Order1042",
      linkDescription: "Lakshmi Stores order",
      amount: 23.5,
      maxPaymentsAllowed: "1",
      partialPayment: "false",
      bindLinkIdMobile: false,
      sendSms: false,
      sendEmail: false,
    });
  });

  it("adds the status callback URL only when one is given", () => {
    const body = buildCreateLinkBody("TestMid", {
      amountPaise: 100,
      linkName: "Order1043",
      description: "Lakshmi Stores order",
      callbackUrl: "https://example.com/api/webhooks/paytm",
    });

    expect(body).toMatchObject({ statusCallbackUrl: "https://example.com/api/webhooks/paytm" });
  });
});

describe("which link a callback paid", () => {
  it("reads the link id Paytm's link webhook puts in MERC_UNQ_REF", () => {
    expect(linkIdOf({ MERC_UNQ_REF: "LI_8812345", STATUS: "TXN_SUCCESS" })).toBe("8812345");
    expect(linkIdOf({ MERC_UNQ_REF: "8812345" })).toBe("8812345");
  });

  it("prefers a linkId field in either spelling", () => {
    expect(linkIdOf({ linkId: "42", MERC_UNQ_REF: "LI_7" })).toBe("42");
    expect(linkIdOf({ LINKID: "43" })).toBe("43");
  });

  it("finds no link when neither is there", () => {
    expect(linkIdOf({ ORDERID: "ORD1", STATUS: "TXN_SUCCESS" })).toBeUndefined();
  });
});

describe("a link counts as paid", () => {
  const paid = { txnId: "T1", status: "SUCCESS", amountPaise: 420000 };

  it("on a success for exactly the link's amount", () => {
    expect(successfulPayment([paid], 420000)).toEqual(paid);
    expect(successfulPayment([{ ...paid, status: "TXN_SUCCESS" }], 420000)?.txnId).toBe("T1");
  });

  it("not on a failed or pending payment", () => {
    expect(successfulPayment([{ ...paid, status: "FAILURE" }], 420000)).toBeNull();
    expect(successfulPayment([{ ...paid, status: "PENDING" }], 420000)).toBeNull();
  });

  it("not on a different amount", () => {
    expect(successfulPayment([{ ...paid, amountPaise: 400000 }], 420000)).toBeNull();
  });

  it("not when nothing was paid", () => {
    expect(successfulPayment([], 420000)).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { parseApproval } from "@/lib/owner/approval";

describe("the owner's spoken decision", () => {
  it("approves on seri, ok and haan, in script or not", () => {
    expect(parseApproval("seri")).toBe("approve");
    expect(parseApproval("சரி")).toBe("approve");
    expect(parseApproval("OK.")).toBe("approve");
    expect(parseApproval("haan")).toBe("approve");
    expect(parseApproval("हाँ भेज दो")).toBe("approve");
  });

  it("rejects on venda and nahi, even with a yes word in the sentence", () => {
    expect(parseApproval("வேண்டாம்")).toBe("reject");
    expect(parseApproval("venda")).toBe("reject");
    expect(parseApproval("nahi, ok")).toBe("reject");
  });

  it("puts it on account when the owner says so", () => {
    expect(parseApproval("கணக்கில் எழுது")).toBe("credit");
    expect(parseApproval("seri, kanakku")).toBe("credit");
    expect(parseApproval("udhaar")).toBe("credit");
  });

  it("does not guess", () => {
    expect(parseApproval("hmm wait")).toBeNull();
    expect(parseApproval("")).toBeNull();
    expect(parseApproval("book")).toBeNull();
  });
});

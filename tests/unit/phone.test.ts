import { describe, expect, it } from "vitest";
import { normalizePhone } from "@/lib/customer/phone";

describe("phone numbers", () => {
  it("accepts what people type", () => {
    expect(normalizePhone("98765 43210")).toBe("+919876543210");
    expect(normalizePhone("+91 98765-43210")).toBe("+919876543210");
    expect(normalizePhone("09876543210")).toBe("+919876543210");
    expect(normalizePhone("919876543210")).toBe("+919876543210");
  });

  it("rejects numbers that cannot be Indian mobiles", () => {
    expect(normalizePhone("12345")).toBeNull();
    expect(normalizePhone("5876543210")).toBeNull();
    expect(normalizePhone("98765432101")).toBeNull();
  });
});

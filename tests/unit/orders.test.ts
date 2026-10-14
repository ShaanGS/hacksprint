import { describe, expect, it } from "vitest";
import { MAX_QTY_PER_LINE, normalizeQuantity } from "@/lib/orders/quantity";
import { canTransition, orderStatuses } from "@/lib/orders/state";
import { lineTotalPaise, orderTotalPaise } from "@/lib/orders/totals";

describe("quantity rules", () => {
  it("keeps packs and pieces whole", () => {
    expect(normalizeQuantity("pack", 2)).toEqual({ ok: true, qty: 2 });
    expect(normalizeQuantity("piece", 2.4)).toEqual({ ok: true, qty: 2 });
  });

  it("weighs loose goods in 50 g steps", () => {
    expect(normalizeQuantity("kg", 0.5)).toEqual({ ok: true, qty: 0.5 });
    expect(normalizeQuantity("kg", 0.26)).toEqual({ ok: true, qty: 0.25 });
    expect(normalizeQuantity("litre", 0.15)).toEqual({ ok: true, qty: 0.15 });
  });

  it("refuses nothing, negatives and absurd amounts", () => {
    expect(normalizeQuantity("pack", 0).ok).toBe(false);
    expect(normalizeQuantity("kg", -1).ok).toBe(false);
    expect(normalizeQuantity("kg", 0.01).ok).toBe(false);
    expect(normalizeQuantity("pack", MAX_QTY_PER_LINE + 1).ok).toBe(false);
    expect(normalizeQuantity("pack", Number.NaN).ok).toBe(false);
  });
});

describe("totals (paise)", () => {
  it("multiplies and rounds each line", () => {
    expect(lineTotalPaise({ qty: 2, unitPricePaise: 1400 })).toBe(2800);
    expect(lineTotalPaise({ qty: 0.5, unitPricePaise: 7000 })).toBe(3500);
    expect(lineTotalPaise({ qty: 0.05, unitPricePaise: 4599 })).toBe(230);
  });

  it("adds the lines of the demo order to ₹121", () => {
    const lines = [
      { qty: 2, unitPricePaise: 1400 },
      { qty: 1, unitPricePaise: 5800 },
      { qty: 0.5, unitPricePaise: 7000 },
    ];
    expect(orderTotalPaise(lines)).toBe(12100);
  });
});

describe("order states", () => {
  it("allows exactly the moves in spec section 8", () => {
    const moves = orderStatuses.flatMap((from) =>
      orderStatuses.filter((to) => canTransition(from, to)).map((to) => `${from}>${to}`),
    );
    expect(moves).toEqual([
      "draft>pending_approval",
      "pending_approval>rejected",
      "pending_approval>awaiting_payment",
      "pending_approval>on_credit",
      "awaiting_payment>paid",
      "paid>delivered",
      "on_credit>delivered",
    ]);
  });

  it("never lets a paid or rejected order go back", () => {
    expect(canTransition("paid", "awaiting_payment")).toBe(false);
    expect(canTransition("rejected", "pending_approval")).toBe(false);
    expect(canTransition("delivered", "paid")).toBe(false);
  });
});

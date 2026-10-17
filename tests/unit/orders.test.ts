import { describe, expect, it, vi } from "vitest";
import { MAX_QTY_PER_LINE, normalizeQuantity } from "@/lib/orders/quantity";
import { canTransition, orderStatuses, transition, TransitionError } from "@/lib/orders/state";
import { lineTotalPaise, orderTotalPaise } from "@/lib/orders/totals";
import { assertDevEnvironment } from "../../scripts/dev/guard";

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

  it("rounds a fraction of a paisa and totals an empty order to zero", () => {
    expect(lineTotalPaise({ qty: 0.333, unitPricePaise: 1000 })).toBe(333);
    expect(orderTotalPaise([])).toBe(0);
  });

  it("refuses negative quantities and prices, and prices that are not whole paise", () => {
    expect(() => lineTotalPaise({ qty: -1, unitPricePaise: 1400 })).toThrow(/negative/);
    expect(() => lineTotalPaise({ qty: 1, unitPricePaise: -500 })).toThrow(/negative/);
    expect(() => lineTotalPaise({ qty: 1, unitPricePaise: 14.5 })).toThrow(/integer in paise/);
  });
});

describe("order states", () => {
  it("allows exactly the moves of the ordering flow", () => {
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

describe("order states, every pair", () => {
  it("never moves an order out of rejected or delivered", () => {
    for (const to of orderStatuses) {
      expect(canTransition("rejected", to)).toBe(false);
      expect(canTransition("delivered", to)).toBe(false);
    }
  });

  it("never moves an order to the state it is in, or skips a step", () => {
    for (const status of orderStatuses) expect(canTransition(status, status)).toBe(false);
    expect(canTransition("draft", "paid")).toBe(false);
    expect(canTransition("pending_approval", "delivered")).toBe(false);
  });

  it("names both states in a refused move", () => {
    const error = new TransitionError("draft", "delivered");
    expect(error.from).toBe("draft");
    expect(error.to).toBe("delivered");
    expect(error.message).toContain("draft to delivered");
  });
});

describe("transition()", () => {
  const orderId = "00000000-0000-4000-8000-000000000001";

  function fakeDb(result: { data: unknown; error: { message: string } | null }) {
    const rpc = vi.fn().mockResolvedValue(result);
    return { db: { rpc } as unknown as Parameters<typeof transition>[0], rpc };
  }

  it("moves the order in the database function, which also writes the audit log", async () => {
    const { db, rpc } = fakeDb({ data: true, error: null });
    const moved = await transition(db, {
      orderId,
      from: "pending_approval",
      to: "rejected",
      actor: "owner",
      reason: "out_of_stock",
    });
    expect(moved).toBe(true);
    expect(rpc).toHaveBeenCalledWith("transition_order", {
      p_order_id: orderId,
      p_from: "pending_approval",
      p_to: "rejected",
      p_actor: "owner",
      p_reason: "out_of_stock",
    });
  });

  it("returns false when the order already moved, so a repeat does nothing", async () => {
    const { db } = fakeDb({ data: false, error: null });
    const moved = await transition(db, {
      orderId,
      from: "awaiting_payment",
      to: "paid",
      actor: "paytm",
    });
    expect(moved).toBe(false);
  });

  it("refuses a move the state machine does not allow without calling the database", async () => {
    const { db, rpc } = fakeDb({ data: true, error: null });
    await expect(
      transition(db, { orderId, from: "draft", to: "paid", actor: "system" }),
    ).rejects.toThrow(TransitionError);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("reports a database failure", async () => {
    const { db } = fakeDb({ data: null, error: { message: "connection reset" } });
    await expect(
      transition(db, { orderId, from: "paid", to: "delivered", actor: "owner" }),
    ).rejects.toThrow(/connection reset/);
  });
});

describe("dev scripts", () => {
  it("refuse to run in production", () => {
    expect(() => assertDevEnvironment("production")).toThrow(/dev-only/);
    expect(() => assertDevEnvironment("development")).not.toThrow();
    expect(() => assertDevEnvironment(undefined)).not.toThrow();
  });
});

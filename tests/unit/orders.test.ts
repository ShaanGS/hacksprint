import { describe, expect, it, vi } from "vitest";
import { lineTotalPaise, orderTotalPaise, type PricedLine } from "@/lib/orders/total";
import {
  canTransition,
  getAllowedTransitions,
  orderStatuses,
  transitionOrder,
  TransitionError,
  type OrderStatus,
} from "@/lib/orders/state";

describe("Order Totals (lib/orders/total.ts)", () => {
  it("calculates exact integer line totals for whole-unit items", () => {
    // 2 packs of Maggi at 1400 paise (₹14.00) each
    expect(lineTotalPaise({ qty: 2, unitPricePaise: 1400 })).toBe(2800);
    // 1 box of matchbox at 2000 paise (₹20.00)
    expect(lineTotalPaise({ qty: 1, unitPricePaise: 2000 })).toBe(2000);
  });

  it("calculates line totals for fractional quantities with exact paisa rounding", () => {
    // Half a kilo (0.5 kg) of sugar at 4600 paise/kg = 2300 paise (₹23.00)
    expect(lineTotalPaise({ qty: 0.5, unitPricePaise: 4600 })).toBe(2300);
    // 0.25 kg of toor dal at 16000 paise/kg = 4000 paise
    expect(lineTotalPaise({ qty: 0.25, unitPricePaise: 16000 })).toBe(4000);
    // 0.333 kg at 1000 paise/kg = 333 paise (rounded from 333.3)
    expect(lineTotalPaise({ qty: 0.333, unitPricePaise: 1000 })).toBe(333);
  });

  it("calculates grand total across multiple items", () => {
    const lines: PricedLine[] = [
      { qty: 2, unitPricePaise: 1400 }, // 2800
      { qty: 1, unitPricePaise: 5800 }, // 5800 (butter)
      { qty: 0.5, unitPricePaise: 4600 }, // 2300 (sugar)
    ];
    // 2800 + 5800 + 2300 = 10900 paise (₹109.00)
    expect(orderTotalPaise(lines)).toBe(10900);
  });

  it("returns 0 paise for an empty order", () => {
    expect(orderTotalPaise([])).toBe(0);
  });

  it("rejects negative quantities", () => {
    expect(() => lineTotalPaise({ qty: -1, unitPricePaise: 1400 })).toThrow(
      /Quantity cannot be negative/,
    );
  });

  it("rejects negative unit prices", () => {
    expect(() => lineTotalPaise({ qty: 1, unitPricePaise: -500 })).toThrow(
      /Unit price cannot be negative/,
    );
  });

  it("rejects non-integer unit prices to prevent floating-point money bugs", () => {
    expect(() => lineTotalPaise({ qty: 1, unitPricePaise: 14.5 })).toThrow(
      /Unit price must be an integer in paise/,
    );
  });
});

describe("Order State Machine (lib/orders/state.ts)", () => {
  const expectedTransitions: Record<OrderStatus, OrderStatus[]> = {
    draft: ["pending_approval"],
    pending_approval: ["rejected", "awaiting_payment", "on_credit"],
    awaiting_payment: ["paid", "on_credit"],
    paid: ["delivered"],
    on_credit: ["delivered"],
    rejected: [],
    delivered: [],
  };

  it("allows every defined transition in the state machine", () => {
    for (const from of orderStatuses) {
      const allowed = expectedTransitions[from];
      for (const to of allowed) {
        expect(canTransition(from, to), `Expected ${from} -> ${to} to be allowed`).toBe(true);
      }
    }
  });

  it("forbids every transition not explicitly allowed across the 7x7 matrix", () => {
    for (const from of orderStatuses) {
      const allowed = new Set(expectedTransitions[from]);
      for (const to of orderStatuses) {
        if (!allowed.has(to)) {
          expect(canTransition(from, to), `Expected ${from} -> ${to} to be forbidden`).toBe(false);
        }
      }
    }
  });

  it("verifies terminal states (rejected, delivered) have no outbound transitions", () => {
    expect(getAllowedTransitions("rejected")).toEqual([]);
    expect(getAllowedTransitions("delivered")).toEqual([]);
    for (const target of orderStatuses) {
      expect(canTransition("rejected", target)).toBe(false);
      expect(canTransition("delivered", target)).toBe(false);
    }
  });

  it("forbids self-transitions and skips", () => {
    expect(canTransition("draft", "draft")).toBe(false);
    expect(canTransition("draft", "paid")).toBe(false);
    expect(canTransition("draft", "delivered")).toBe(false);
    expect(canTransition("pending_approval", "delivered")).toBe(false);
    expect(canTransition("paid", "draft")).toBe(false);
  });

  it("TransitionError contains source and target statuses", () => {
    const error = new TransitionError("draft", "delivered");
    expect(error.from).toBe("draft");
    expect(error.to).toBe("delivered");
    expect(error.message).toContain('Forbidden order transition from "draft" to "delivered"');
    expect(error.name).toBe("TransitionError");
  });
});

describe("Order Transition Execution & Audit Log", () => {
  function createMockSupabase(options: {
    updateResult: { id: string; shop_id: string; status: string } | null;
  }) {
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    const maybeSingleMock = vi.fn().mockResolvedValue({ data: options.updateResult, error: null });
    const selectMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
    const eqStatusMock = vi.fn().mockReturnValue({ select: selectMock });
    const eqIdMock = vi.fn().mockReturnValue({ eq: eqStatusMock });
    const updateMock = vi.fn().mockReturnValue({ eq: eqIdMock });

    const fromMock = vi.fn((table: string) => {
      if (table === "orders") {
        return { update: updateMock };
      }
      if (table === "audit_log") {
        return { insert: insertMock };
      }
      throw new Error(`Unexpected table ${table}`);
    });

    return {
      client: { from: fromMock } as unknown as Parameters<typeof transitionOrder>[0],
      mocks: { updateMock, eqIdMock, eqStatusMock, insertMock },
    };
  }

  it("successfully updates order and writes to audit_log", async () => {
    const orderId = "00000000-0000-0000-0000-000000000001";
    const shopId = "00000000-0000-0000-0000-000000000002";
    const { client, mocks } = createMockSupabase({
      updateResult: { id: orderId, shop_id: shopId, status: "pending_approval" },
    });

    const result = await transitionOrder(client, {
      orderId,
      from: "draft",
      to: "pending_approval",
      actor: "customer",
    });

    expect(result).toBe(true);
    expect(mocks.updateMock).toHaveBeenCalledWith({ status: "pending_approval" });
    expect(mocks.eqIdMock).toHaveBeenCalledWith("id", orderId);
    expect(mocks.eqStatusMock).toHaveBeenCalledWith("status", "draft");

    // Verify audit_log entry was inserted
    expect(mocks.insertMock).toHaveBeenCalledWith({
      shop_id: shopId,
      actor: "customer",
      action: "order_status_draft_to_pending_approval",
      entity_type: "order",
      entity_id: orderId,
      payload: {
        from: "draft",
        to: "pending_approval",
      },
    });
  });

  it("handles rejection with reason code in audit_log", async () => {
    const orderId = "00000000-0000-0000-0000-000000000001";
    const shopId = "00000000-0000-0000-0000-000000000002";
    const { client, mocks } = createMockSupabase({
      updateResult: { id: orderId, shop_id: shopId, status: "rejected" },
    });

    const result = await transitionOrder(client, {
      orderId,
      from: "pending_approval",
      to: "rejected",
      actor: "owner",
      reason: "out_of_stock",
    });

    expect(result).toBe(true);
    expect(mocks.insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        actor: "owner",
        action: "order_status_pending_approval_to_rejected",
        payload: {
          from: "pending_approval",
          to: "rejected",
          reason: "out_of_stock",
        },
      }),
    );
  });

  it("is idempotent: returns false without writing audit log if order was already transitioned", async () => {
    const { client, mocks } = createMockSupabase({
      updateResult: null, // No row matched because status was no longer 'draft'
    });

    const result = await transitionOrder(client, {
      orderId: "00000000-0000-0000-0000-000000000001",
      from: "draft",
      to: "pending_approval",
      actor: "customer",
    });

    expect(result).toBe(false);
    expect(mocks.insertMock).not.toHaveBeenCalled();
  });

  it("throws TransitionError and does not touch database on forbidden transition", async () => {
    const { client, mocks } = createMockSupabase({ updateResult: null });

    await expect(
      transitionOrder(client, {
        orderId: "00000000-0000-0000-0000-000000000001",
        from: "draft",
        to: "paid",
        actor: "system",
      }),
    ).rejects.toThrow(TransitionError);

    expect(mocks.updateMock).not.toHaveBeenCalled();
  });
});

import { describe, expect, it, vi } from "vitest";
import {
  assertDevEnvironment,
  createDevOrder,
  EnvironmentError,
} from "../../scripts/dev/create-order";
import { orderTotalPaise } from "@/lib/orders/total";

describe("dev-only create-order environment guard", () => {
  it("refuses to run when NODE_ENV is production", () => {
    expect(() => assertDevEnvironment("production")).toThrow(EnvironmentError);
    expect(() => assertDevEnvironment("production")).toThrow(
      /Refusing to run: create-order is a dev-only script/,
    );
  });

  it("permits running in non-production environments", () => {
    expect(() => assertDevEnvironment("development")).not.toThrow();
    expect(() => assertDevEnvironment("test")).not.toThrow();
    expect(() => assertDevEnvironment(undefined)).not.toThrow();
  });
});

describe("createDevOrder workflow", () => {
  function createMockSupabase(options?: {
    shop?: { id: string; name: string } | null;
    customer?: { id: string } | null;
    products?: Array<{ id: string; name: string; price_paise: number }> | null;
  }) {
    const shopData =
      options?.shop !== undefined ? options.shop : { id: "shop-123", name: "Lakshmi Stores" };

    const customerData =
      options?.customer !== undefined ? options.customer : { id: "customer-456" };

    const productsData =
      options?.products !== undefined
        ? options.products
        : [
            { id: "prod-1", name: "Aashirvaad Shudh Chakki Atta", price_paise: 29500 },
            { id: "prod-2", name: "Amul Butter", price_paise: 5800 },
            { id: "prod-3", name: "Bisleri Water", price_paise: 2000 },
          ];

    const insertedOrder = { id: "order-789", status: "draft" };
    const insertedItems: unknown[] = [];
    const auditLogs: unknown[] = [];

    const mockDb: any = {
      from: vi.fn((table: string) => {
        if (table === "shops") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: shopData, error: null }),
          };
        }
        if (table === "customers") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: customerData, error: null }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi
                  .fn()
                  .mockResolvedValue({ data: { id: "new-customer-999" }, error: null }),
              }),
            }),
          };
        }
        if (table === "products") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            gt: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({ data: productsData, error: null }),
          };
        }
        if (table === "orders") {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: insertedOrder, error: null }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  select: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: { id: "order-789", shop_id: "shop-123", status: "pending_approval" },
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "order_items") {
          return {
            insert: vi.fn((data) => {
              insertedItems.push(...data);
              return Promise.resolve({ error: null });
            }),
          };
        }
        if (table === "audit_log") {
          return {
            insert: vi.fn((entry) => {
              auditLogs.push(entry);
              return Promise.resolve({ error: null });
            }),
          };
        }
        throw new Error(`Unexpected table ${table}`);
      }),
    };

    return { mockDb, insertedItems, auditLogs };
  }

  it("creates order, computes exact paise total, and transitions to pending_approval", async () => {
    const { mockDb, insertedItems, auditLogs } = createMockSupabase();

    const result = await createDevOrder(mockDb);

    expect(result.shopName).toBe("Lakshmi Stores");
    expect(result.orderId).toBe("order-789");
    expect(result.status).toBe("pending_approval");
    expect(result.items).toHaveLength(3);

    // Verify totals calculation: (2 * 29500) + (1 * 5800) + (1 * 2000) = 59000 + 5800 + 2000 = 66800 paise
    const expectedTotal = orderTotalPaise([
      { qty: 2, unitPricePaise: 29500 },
      { qty: 1, unitPricePaise: 5800 },
      { qty: 1, unitPricePaise: 2000 },
    ]);
    expect(result.totalPaise).toBe(expectedTotal);
    expect(result.totalPaise).toBe(66800);

    // Verify order_items inserted
    expect(insertedItems).toHaveLength(3);
    expect(insertedItems[0]).toEqual({
      order_id: "order-789",
      product_id: "prod-1",
      qty: 2,
      unit_price_paise: 29500,
    });

    // Verify audit_log entry written by transitionOrder
    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0]).toMatchObject({
      shop_id: "shop-123",
      actor: "customer",
      action: "order_status_draft_to_pending_approval",
      entity_type: "order",
      entity_id: "order-789",
    });
  });

  it("throws error if seed shop is not found", async () => {
    const { mockDb } = createMockSupabase({ shop: null });
    await expect(createDevOrder(mockDb)).rejects.toThrow(/Seed shop "Lakshmi Stores" not found/);
  });

  it("throws error if fewer than 2 seed products are available", async () => {
    const { mockDb } = createMockSupabase({
      products: [{ id: "prod-1", name: "Sugar", price_paise: 4600 }],
    });
    await expect(createDevOrder(mockDb)).rejects.toThrow(/Could not find at least 2 seed products/);
  });
});

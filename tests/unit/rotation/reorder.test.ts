import { describe, expect, it } from "vitest";
import type { ShopReceipt } from "@/lib/rotation/load";
import { linePaise, linesTotalPaise, reorderPlan, skipped } from "@/lib/rotation/reorder";
import type { ShelfItem } from "@/lib/rotation/stock";

const BALAJI = "00000000-0000-4000-8000-0000000000d1";
const MURUGAN = "00000000-0000-4000-8000-0000000000d2";

function item(id: string, tags: ShelfItem["tags"], daysLeft: ShelfItem["daysLeft"] = 3): ShelfItem {
  return {
    product: { id, name: `Product ${id}`, art: "bag", unit: "pack", packSize: null },
    estimateQty: 2,
    countedAt: "2026-10-16T14:30:00.000Z",
    weeklySales: { perWeek: 10, from: "counts" },
    daysLeft,
    unitCostPaise: 1_200,
    valuePaise: 2_400,
    tags,
    countAsked: false,
  };
}

function receipt(
  productId: string,
  at: string,
  qty: number,
  unitCostPaise: number,
  distributor: [string, string] | null,
): ShopReceipt {
  return {
    productId,
    qty,
    at,
    unitCostPaise,
    lineTotalPaise: qty * unitCostPaise,
    billId: `bill-${at}`,
    billedOn: at.slice(0, 10),
    distributorId: distributor?.[0] ?? null,
    distributor: distributor?.[1] ?? null,
  };
}

const balaji: [string, string] = [BALAJI, "Sri Balaji Agencies"];
const murugan: [string, string] = [MURUGAN, "Murugan Traders"];

describe("reorder plan (agent, decision of Oct 17)", () => {
  it("orders only what runs out this week, never slow stock", () => {
    const items = [item("maggi", ["low"]), item("jaggery", ["slow"], 54), item("rice", [], 24)];
    const receipts = [
      receipt("maggi", "2026-10-03T10:00:00.000Z", 60, 1_200, balaji),
      receipt("jaggery", "2026-10-03T10:00:00.000Z", 20, 5_000, balaji),
      receipt("rice", "2026-10-03T10:00:00.000Z", 100, 6_000, balaji),
    ];
    const plan = reorderPlan(items, receipts);
    expect(plan).toHaveLength(1);
    expect(plan[0].lines.map((line) => line.productId)).toEqual(["maggi"]);
  });

  it("takes the quantity and price of the latest bill, not an older one", () => {
    const receipts = [
      receipt("maggi", "2026-09-20T10:00:00.000Z", 40, 1_100, balaji),
      receipt("maggi", "2026-10-03T10:00:00.000Z", 60, 1_200, balaji),
    ];
    const [group] = reorderPlan([item("maggi", ["low"])], receipts);
    expect(group.lines[0]).toMatchObject({ qty: 60, unitCostPaise: 1_200, linePaise: 72_000 });
    expect(group.totalPaise).toBe(72_000);
  });

  it("groups by the distributor who sent each item, one order each", () => {
    const receipts = [
      receipt("maggi", "2026-10-03T10:00:00.000Z", 60, 1_200, balaji),
      receipt("atta", "2026-10-04T10:00:00.000Z", 10, 25_400, murugan),
      receipt("soap", "2026-10-05T10:00:00.000Z", 24, 3_000, balaji),
    ];
    const plan = reorderPlan(
      [item("maggi", ["low"]), item("atta", ["low"]), item("soap", ["low"])],
      receipts,
    );
    expect(plan.map((g) => [g.distributor, g.lines.length, g.totalPaise])).toEqual([
      ["Murugan Traders", 1, 254_000],
      ["Sri Balaji Agencies", 2, 144_000],
    ]);
  });

  it("leaves out an item no bill names a distributor for, and says so", () => {
    const items = [item("maggi", ["low"]), item("loose-dal", ["low"])];
    const receipts = [
      receipt("maggi", "2026-10-03T10:00:00.000Z", 60, 1_200, balaji),
      receipt("loose-dal", "2026-10-03T10:00:00.000Z", 5, 9_000, null),
    ];
    expect(reorderPlan(items, receipts).flatMap((g) => g.lines.map((l) => l.productId))).toEqual([
      "maggi",
    ]);
    expect(skipped(items, receipts).noBill).toEqual(["Product loose-dal"]);
  });

  it("counts what was left out and why", () => {
    const items = [
      item("maggi", ["low"]),
      item("jaggery", ["slow"], 54),
      item("tea", ["slow"], "not_moving"),
      item("rice", [], 24),
      item("new", [], null),
    ];
    expect(skipped(items, [])).toMatchObject({ slow: 2, lasting: 1 });
  });

  it("works in whole paise for loose quantities", () => {
    expect(linePaise(0.5, 4_599)).toBe(2_300);
    expect(linesTotalPaise([{ linePaise: 2_300 }, { linePaise: 72_000 }])).toBe(74_300);
  });
});

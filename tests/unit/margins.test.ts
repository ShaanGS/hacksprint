import { describe, expect, it } from "vitest";
import type { Product } from "@/lib/catalog";
import { margins, type CostLine } from "@/lib/margins";

const atta: Product = {
  id: "atta",
  code: "atta",
  name: "Aashirvaad Shudh Chakki Atta",
  packSize: "5 kg",
  category: "atta",
  unit: "pack",
  pricePaise: 29500,
  stockQty: 12,
  lowStockThreshold: 3,
  art: "atta",
  priceSource: null,
};
const salt: Product = { ...atta, id: "salt", code: "salt", name: "Tata Salt", pricePaise: 2800 };

const line = (productId: string, distributorId: string, cost: number, at: string): CostLine => ({
  productId,
  distributorId,
  distributor: distributorId === "balaji" ? "Sri Balaji Agencies" : "Murugan Traders",
  unitCostPaise: cost,
  at,
});

describe("margins", () => {
  const lines = [
    line("atta", "balaji", 25400, "2026-10-07"),
    line("atta", "murugan", 24500, "2026-10-11"),
    line("atta", "balaji", 27400, "2026-10-17"),
    line("salt", "balaji", 2400, "2026-10-17"),
  ];

  it("takes profit from the latest cost", () => {
    const [attaMargin] = margins([atta], lines);
    expect(attaMargin.costPaise).toBe(27400);
    expect(attaMargin.profitPaise).toBe(2100);
    expect(attaMargin.percent).toBe(7);
  });

  it("names the cheaper distributor and the saving per unit", () => {
    expect(margins([atta], lines)[0].cheaper).toEqual({
      distributor: "Murugan Traders",
      costPaise: 24500,
      savingPaise: 2900,
    });
    expect(margins([salt], lines)[0].cheaper).toBeNull();
  });

  it("uses each distributor's latest cost, not an old cheaper bill", () => {
    const older = [...lines, line("atta", "murugan", 20000, "2026-09-01")];
    expect(margins([atta], older)[0].cheaper?.costPaise).toBe(24500);
  });

  it("lists items a cheaper distributor would help first, and skips unbilled ones", () => {
    const unbilled = { ...atta, id: "tea", code: "tea" };
    expect(margins([salt, unbilled, atta], lines).map((m) => m.productId)).toEqual([
      "atta",
      "salt",
    ]);
  });
});

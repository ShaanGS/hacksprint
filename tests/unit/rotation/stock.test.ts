import { describe, expect, it } from "vitest";
import {
  COUNT_TOP_N,
  daysLeft,
  onShelf,
  shelf,
  stockEstimate,
  stuckMoney,
  weeklySales,
  type Count,
  type Receipt,
} from "@/lib/rotation/stock";
import { at, daysAgo, NOW } from "./fixture";

const count = (days: number, qty: number, productId = "atta"): Count => ({
  productId,
  qty,
  at: at(daysAgo(days), "20:00"),
});
const receipt = (days: number, qty: number, productId = "atta", cost = 25_400): Receipt => ({
  productId,
  qty,
  at: at(daysAgo(days), "10:00"),
  unitCostPaise: cost,
});

describe("weekly sales (9.2)", () => {
  it("comes from the last two counts and what came in between", () => {
    const sales = weeklySales([count(14, 30), count(7, 48)], [receipt(11, 30)], NOW);
    expect(sales?.from).toBe("counts");
    expect(sales?.perWeek).toBeCloseTo(12);
  });

  it("uses the re-buy rate for a product with only one count", () => {
    const sales = weeklySales([count(7, 24)], [receipt(39, 6), receipt(53, 6)], NOW);
    expect(sales).toEqual({ perWeek: 1.5, from: "rebuy" });
  });

  it("is not known when the product was bought only once in 8 weeks", () => {
    expect(weeklySales([], [receipt(10, 6)], NOW)).toBeNull();
  });
});

describe("the stock estimate (9.1)", () => {
  it("is the last count plus received since minus sales since, never below zero", () => {
    const counts = [count(14, 30), count(7, 48)];
    const receipts = [receipt(11, 30), receipt(4, 10)];
    const estimate = stockEstimate(counts, receipts, weeklySales(counts, receipts, NOW), NOW);
    expect(estimate.countedAt).toBe(counts[1].at);
    // From 8 pm a week ago to 3 pm today is 163 hours.
    expect(estimate.qty).toBeCloseTo(48 + 10 - (12 * 163) / (7 * 24), 5);
    expect(stockEstimate([count(7, 2)], [], { perWeek: 50, from: "counts" }, NOW).qty).toBe(0);
  });

  it("for a product never counted, is what came in over 8 weeks less 8 weeks of sales", () => {
    const receipts = [receipt(10, 20), receipt(30, 20)];
    const estimate = stockEstimate([], receipts, weeklySales([], receipts, NOW), NOW);
    expect(estimate).toEqual({ qty: 0, countedAt: null });
  });

  it("with no shelf counts and one purchase, keeps what came in", () => {
    expect(stockEstimate([], [receipt(10, 20)], null, NOW)).toEqual({ qty: 20, countedAt: null });
  });
});

describe("days left (9.9) and tags", () => {
  it("is not moving at zero sales", () => {
    expect(daysLeft(8, { perWeek: 0, from: "counts" }, true)).toBe("not_moving");
  });

  it("is unknown for a product never counted or with no sales data", () => {
    expect(daysLeft(0, { perWeek: 10, from: "rebuy" }, false)).toBeNull();
    expect(daysLeft(5, null, true)).toBeNull();
  });

  it("divides stock by daily sales", () => {
    expect(daysLeft(14, { perWeek: 7, from: "counts" }, true)).toBe(14);
  });
});

describe("the shelf (9.3, 9.10)", () => {
  const products = [
    { id: "atta", name: "Atta", art: "atta", unit: "pack", packSize: "5 kg" },
    { id: "detergent", name: "Detergent", art: "detergent", unit: "pack", packSize: null },
    { id: "mystery", name: "Mystery", art: "bag", unit: "pack", packSize: null },
  ];
  const counts = [
    count(14, 30),
    count(7, 48),
    count(14, 8, "detergent"),
    count(7, 8, "detergent"),
    count(7, 5, "mystery"),
  ];
  const receipts = [receipt(11, 30), receipt(4, 10), receipt(61, 8, "detergent", 11_800)];
  const items = shelf(products, counts, receipts, NOW);

  it("lists a product with no bill cost as cost unknown, never guessed", () => {
    expect(onShelf(items).costUnknown.map((p) => p.id)).toEqual(["mystery"]);
    expect(items.find((i) => i.product.id === "mystery")?.valuePaise).toBeNull();
  });

  it("counts stock that does not move as stuck money", () => {
    const stuck = stuckMoney(items);
    expect(stuck.items.map((i) => i.product.id)).toEqual(["detergent"]);
    expect(stuck.paise).toBe(8 * 11_800);
  });

  it("asks for counts of the top products by money only", () => {
    expect(COUNT_TOP_N).toBe(20);
    expect(
      items
        .filter((i) => i.countAsked)
        .map((i) => i.product.id)
        .sort(),
    ).toEqual(["atta", "detergent"]);
  });
});

import { describe, expect, it } from "vitest";
import type { ShopData } from "@/lib/rotation/load";
import { snapshotOf } from "@/lib/rotation/snapshot";
import { rotationSource } from "@/lib/rotation/sources";
import { at, costs, customers, dayCloses, NOW, payables, payments, TODAY } from "./fixture";

// Rule 5: the rows behind the money now add up to it, also once a bill is paid after the night's
// figure. The demo shop, after the late payers paid ₹9,600 by link and Murugan's bill was paid.

const data: ShopData = {
  now: NOW,
  today: TODAY,
  customers,
  payables: payables.map((p) => ({
    ...p,
    ...(p.id === "murugan" ? { paid: true, paidAt: at(TODAY, "14:00") } : {}),
    kind: "supplier_bill",
    distributorId: p.distributor,
    paidVia: p.id === "murugan" ? "upi" : p.paid ? "cash" : null,
    createdAt: at(TODAY, "09:00"),
  })),
  costs,
  dayCloses,
  payments: [
    ...payments,
    { paidAt: at(TODAY, "11:00"), amountPaise: 960_000, isCreditRepayment: true },
  ].map((p, index) => ({ ...p, id: `payment-${index}`, customerId: null })),
  products: [],
  counts: [],
  receipts: [],
};

describe("where the money now came from", () => {
  it("adds up to it, with the bill paid since taken off", () => {
    const snapshot = snapshotOf(data);
    const source = rotationSource("money_now", data, snapshot);
    expect(snapshot.week.likely.now.paise).toBe(280_000);
    expect(source.total_paise).toBe(280_000);
    expect(source.rows.map((row) => [row.kind, row.paise, row.label])).toEqual([
      ["money_in_hand", 720_000, "owner_said"],
      ["payment", 960_000, "verified_payment"],
      ["bill_paid", -1_400_000, "owner_said"],
    ]);
    expect(source.rows[2]).toMatchObject({ distributor: "Murugan Traders", bill_number: "MT-140" });
  });
});

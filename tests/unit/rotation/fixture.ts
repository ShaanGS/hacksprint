import type { CustomerLedger, LedgerEntry } from "@/lib/rotation/credit";
import type { Cost, DayClose, Payable, Payment } from "@/lib/rotation/forecast";
import { addDays } from "@/lib/time";

// The seeded demo shop in plain numbers (supabase/migrations/20261017140100_rotation_demo.sql),
// on demo day at 3 pm in India.

export const NOW = new Date("2026-10-18T09:30:00.000Z");
export const TODAY = "2026-10-18";

/** An instant on a shop date at a time in India. */
export function at(date: string, time: string): string {
  return new Date(`${date}T${time}:00+05:30`).toISOString();
}

export const daysAgo = (days: number) => addDays(TODAY, -days);

type Credit = [saleDaysAgo: number, rupees: number, repayAfter: number | null, byLink?: boolean];

export function ledger(customerId: string, name: string, credits: Credit[]): CustomerLedger {
  const entries: LedgerEntry[] = credits.flatMap(([sale, rupees, repayAfter, byLink]) => {
    const credit: LedgerEntry = {
      at: at(daysAgo(sale), "18:30"),
      amountPaise: rupees * 100,
      source: "owner_said",
    };
    if (repayAfter === null) return [credit];
    const repaid: LedgerEntry = {
      at: at(daysAgo(sale - repayAfter), "11:00"),
      amountPaise: -rupees * 100,
      source: byLink ? "verified_payment" : "owner_said",
    };
    return [credit, repaid];
  });
  return { customerId, name, phone: "+910000000000", lang: "ta", entries };
}

export const customers: CustomerLedger[] = [
  ledger("arjun", "Arjun Reddy", [
    [90, 3100, 11],
    [65, 2800, 12],
    [42, 3500, 13, true],
    [21, 4200, null],
  ]),
  ledger("meena", "Meena Krishnan", [
    [80, 1800, 6],
    [60, 2100, 7, true],
    [40, 1900, 8],
    [15, 3000, null],
  ]),
  ledger("rahul", "Rahul Sharma", [
    [75, 1500, 4],
    [55, 1700, 5],
    [35, 1600, 6, true],
    [9, 2400, null],
  ]),
  ledger("priya", "Priya Natarajan", [
    [95, 1200, 9],
    [70, 1400, 10, true],
    [45, 1300, 11],
    [4, 1600, null],
  ]),
  ledger("karthik", "Karthik Subramanian", [
    [85, 1000, 7],
    [60, 900, 7],
    [30, 1100, 8, true],
    [3, 1200, null],
  ]),
  ledger("lakshmi", "Lakshmi Raman", [
    [100, 800, 13],
    [75, 950, 14],
    [50, 850, 15],
    [2, 900, null],
  ]),
  ledger("imran", "Imran Khan", [
    [40, 600, 8],
    [6, 700, null],
  ]),
  ledger("divya", "Divya Shetty", [[1, 500, null]]),
  ledger("ramesh", "Ramesh Kumar", [
    [50, 300, 5],
    [35, 250, 6],
    [20, 400, 7],
  ]),
];

export const payables: Payable[] = [
  {
    id: "deepavali",
    amountPaise: 4_850_000,
    dueDate: addDays(TODAY, 4),
    paid: false,
    distributor: "Sri Balaji Agencies",
    billNumber: "DV-1",
    purchaseOrderId: "order",
  },
  {
    id: "overdue",
    amountPaise: 2_150_000,
    dueDate: addDays(TODAY, -3),
    paid: false,
    distributor: "Sri Balaji Agencies",
    billNumber: "SB-2070",
    purchaseOrderId: null,
  },
  {
    id: "murugan",
    amountPaise: 1_400_000,
    dueDate: addDays(TODAY, 2),
    paid: false,
    distributor: "Murugan Traders",
    billNumber: "MT-140",
    purchaseOrderId: null,
  },
  {
    id: "later",
    amountPaise: 2_150_000,
    dueDate: addDays(TODAY, 11),
    paid: false,
    distributor: "Sri Balaji Agencies",
    billNumber: "SB-2072",
    purchaseOrderId: null,
  },
  {
    id: "paid",
    amountPaise: 1_400_000,
    dueDate: addDays(TODAY, -5),
    paid: true,
    distributor: "Murugan Traders",
    billNumber: "MT-139",
    purchaseOrderId: null,
  },
];

export const costs: Cost[] = [
  { kind: "rent", amountPaise: 1_300_000, period: "month" },
  { kind: "staff", amountPaise: 300_000, period: "week" },
  { kind: "home", amountPaise: 350_000, period: "week" },
  { kind: "cash_purchases", amountPaise: 200_000, period: "week" },
];

/** ₹5,000 cash said each night for the last 40 days; ₹7,200 in hand said last night. */
export const dayCloses: DayClose[] = Array.from({ length: 40 }, (_, index) => {
  const date = daysAgo(index + 1);
  return {
    businessDate: date,
    cashSalesPaise: 500_000,
    moneyInHandPaise: index === 0 ? 720_000 : 900_000,
    recordedAt: at(date, "21:30"),
  };
});

/** ₹2,000 a day through Paytm, in four payments. */
export const payments: Payment[] = Array.from({ length: 40 }, (_, index) =>
  daysAgo(index + 1),
).flatMap((date) =>
  [
    ["10:15", 23_000],
    ["13:40", 56_000],
    ["17:05", 34_000],
    ["19:50", 87_000],
  ].map(([time, amount]) => ({
    paidAt: at(date, time as string),
    amountPaise: amount as number,
    isCreditRepayment: false,
  })),
);

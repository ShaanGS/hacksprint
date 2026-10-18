import type { PlannerFacts } from "@/lib/planner/facts";

// The demo week in planner facts: short by ₹36,500 with ₹7,200 in hand, three late payers,
// Murugan Traders' bill payable inside the owner's limit, and a ₹27,000 loan for the festival.
export const facts: PlannerFacts = {
  asOf: "2026-10-18T15:00:00+05:30",
  today: "2026-10-18",
  week: {
    state: "short",
    gapPaise: -3_650_000,
    neededPaise: 9_550_000,
    likelyPaise: 5_900_000,
    inHandPaise: 720_000,
    latePaise: 960_000,
    label: "owner_said",
  },
  latePayers: [
    {
      customerId: "c1",
      name: "Arjun Reddy",
      owesPaise: 420_000,
      usualDays: 12,
      daysLate: 9,
      label: "owner_said",
    },
    {
      customerId: "c2",
      name: "Meena Krishnan",
      owesPaise: 300_000,
      usualDays: 7,
      daysLate: 8,
      label: "owner_said",
    },
    {
      customerId: "c3",
      name: "Rahul Sharma",
      owesPaise: 240_000,
      usualDays: 5,
      daysLate: 4,
      label: "owner_said",
    },
  ],
  bills: [],
  low: [],
  reorder: [{ distributorId: "d1", distributor: "Murugan Traders", totalPaise: 73_200, lines: 1 }],
  loan: {
    festival: {
      payableId: "p-dv1",
      festival: "Deepavali",
      distributor: "Sri Balaji Agencies",
      totalPaise: 4_850_000,
      dueThisWeek: true,
    },
    gapWithoutOrderPaise: 1_200_000,
    canCollectPaise: 960_000,
    loanNeededPaise: 2_700_000,
    band: "shishu",
    label: "estimate",
  },
  billLimit: {
    mandate: { weeklyLimitPaise: 2_500_000, keepInHandPaise: 200_000 },
    limitLeftPaise: 2_500_000,
    // With ₹7,200 in hand nothing can be paid yet; once the late payers' ₹9,600 is in, Murugan
    // Traders' ₹14,000 bill fits and leaves ₹2,800, above the ₹2,000 floor.
    decisions: [
      {
        payableId: "p-sb2070",
        distributor: "Sri Balaji Agencies",
        amountPaise: 2_150_000,
        decision: "hold",
        reason: "not_enough_in_hand",
        needsMorePaise: 1_630_000,
      },
      {
        payableId: "p-mt140",
        distributor: "Murugan Traders",
        amountPaise: 1_400_000,
        decision: "hold",
        reason: "not_enough_in_hand",
        needsMorePaise: 880_000,
      },
    ],
    ifCollected: [
      {
        payableId: "p-sb2070",
        distributor: "Sri Balaji Agencies",
        amountPaise: 2_150_000,
        decision: "hold",
        reason: "not_enough_in_hand",
        needsMorePaise: 670_000,
      },
      {
        payableId: "p-mt140",
        distributor: "Murugan Traders",
        amountPaise: 1_400_000,
        decision: "pay",
        reason: "within_limit",
        needsMorePaise: 0,
      },
    ],
  },
  lastPlan: null,
};

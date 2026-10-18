import type { PlannerFacts } from "@/lib/planner/facts";
import type { checkPlan } from "@/lib/planner/plan";

// Fixed weeks for the planner eval. Each starts from the demo week (short by ₹36,500, three
// late payers, a ₹25,000 bill limit, the Deepavali order) and changes one thing, with the
// behaviour the plan must show. Amounts are paise, as everywhere.

export type Checked = ReturnType<typeof checkPlan>;
export type Scenario = {
  name: string;
  goal: string;
  facts: PlannerFacts;
  checks: { name: string; pass: (plan: Checked) => boolean }[];
};

export const late = [
  {
    customerId: "c1",
    name: "Arjun Reddy",
    owesPaise: 420_000,
    usualDays: 12,
    daysLate: 9,
    label: "owner_said" as const,
  },
  {
    customerId: "c2",
    name: "Meena Krishnan",
    owesPaise: 300_000,
    usualDays: 7,
    daysLate: 8,
    label: "owner_said" as const,
  },
  {
    customerId: "c3",
    name: "Rahul Sharma",
    owesPaise: 240_000,
    usualDays: 5,
    daysLate: 4,
    label: "owner_said" as const,
  },
];
export const hold = (
  id: string,
  distributor: string,
  amountPaise: number,
  needsMorePaise: number,
) => ({
  payableId: id,
  distributor,
  amountPaise,
  decision: "hold" as const,
  reason: "not_enough_in_hand",
  needsMorePaise,
});
export const pay = (id: string, distributor: string, amountPaise: number) => ({
  payableId: id,
  distributor,
  amountPaise,
  decision: "pay" as const,
  reason: "within_limit",
  needsMorePaise: 0,
});

export const demo: PlannerFacts = {
  asOf: "2026-10-18T10:00:00+05:30",
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
  latePayers: late,
  bills: [
    {
      payableId: "p-sb2070",
      distributor: "Sri Balaji Agencies",
      billNumber: "SB-2070",
      amountPaise: 2_150_000,
      dueInDays: 0,
      overdueDays: 3,
      festivalOrder: false,
    },
    {
      payableId: "p-mt140",
      distributor: "Murugan Traders",
      billNumber: "MT-140",
      amountPaise: 1_400_000,
      dueInDays: 2,
      overdueDays: 0,
      festivalOrder: false,
    },
    {
      payableId: "p-dv1",
      distributor: "Sri Balaji Agencies",
      billNumber: "DV-1",
      amountPaise: 4_850_000,
      dueInDays: 4,
      overdueDays: 0,
      festivalOrder: true,
    },
  ],
  low: [],
  reorder: [],
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
    decisions: [
      hold("p-sb2070", "Sri Balaji Agencies", 2_150_000, 1_630_000),
      hold("p-mt140", "Murugan Traders", 1_400_000, 880_000),
    ],
    ifCollected: [
      hold("p-sb2070", "Sri Balaji Agencies", 2_150_000, 670_000),
      pay("p-mt140", "Murugan Traders", 1_400_000),
    ],
  },
  lastPlan: null,
};

const actions = (plan: Checked) => plan.steps.map((step) => step.action);
const before = (plan: Checked, first: string, then: string) => {
  const list: string[] = actions(plan);
  return !list.includes(then) || (list.includes(first) && list.indexOf(first) < list.indexOf(then));
};

export const scenarios: Scenario[] = [
  {
    name: "demo week, before collecting",
    goal: "",
    facts: demo,
    checks: [
      { name: "collects first", pass: (plan) => actions(plan)[0] === "collect" },
      {
        name: "pays a bill only after collecting",
        pass: (plan) => before(plan, "collect", "pay_bills"),
      },
      {
        name: "borrows only after collecting",
        pass: (plan) => before(plan, "collect", "check_loan"),
      },
    ],
  },
  {
    name: "demo week, after collecting",
    goal: "",
    facts: {
      ...demo,
      week: {
        ...demo.week,
        gapPaise: -2_690_000,
        likelyPaise: 6_860_000,
        inHandPaise: 1_680_000,
        latePaise: 0,
      },
      latePayers: [],
      billLimit: { ...demo.billLimit!, decisions: demo.billLimit!.ifCollected },
    },
    checks: [
      {
        name: "pays the bill the limit allows",
        pass: (plan) =>
          plan.steps.some((s) => s.action === "pay_bills" && s.ids.includes("p-mt140")),
      },
      { name: "plans no collection", pass: (plan) => !actions(plan).includes("collect") },
    ],
  },
  {
    name: "a good week",
    goal: "",
    facts: {
      ...demo,
      week: { ...demo.week, state: "ok", gapPaise: 1_500_000, latePaise: 0 },
      latePayers: [],
      loan: { ...demo.loan, festival: null, loanNeededPaise: 0, band: null },
    },
    checks: [
      { name: "no loan", pass: (plan) => !actions(plan).includes("check_loan") },
      { name: "a short plan", pass: (plan) => plan.steps.length <= 2 },
    ],
  },
  {
    name: "no bill limit set",
    goal: "",
    facts: {
      ...demo,
      billLimit: { mandate: null, limitLeftPaise: 0, decisions: [], ifCollected: [] },
    },
    checks: [{ name: "pays no bill", pass: (plan) => !actions(plan).includes("pay_bills") }],
  },
  {
    name: "stock running out",
    goal: "",
    facts: {
      ...demo,
      low: [{ productId: "x1", name: "Maggi Masala Noodles", daysLeft: 3 }],
      reorder: [
        { distributorId: "d-mt", distributor: "Murugan Traders", totalPaise: 73_200, lines: 1 },
      ],
    },
    checks: [{ name: "reorders what runs out", pass: (plan) => actions(plan).includes("reorder") }],
  },
  {
    name: "owner wants no loan",
    goal: "I do not want any loan this week",
    facts: demo,
    checks: [
      { name: "no loan", pass: (plan) => !actions(plan).includes("check_loan") },
      { name: "still collects", pass: (plan) => actions(plan).includes("collect") },
    ],
  },
];

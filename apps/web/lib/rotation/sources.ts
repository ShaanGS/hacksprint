import { z } from "zod";
import type { CustomerPosition } from "@/lib/rotation/credit";
import { addDays, shopDate } from "@/lib/time";
import { FORECAST_DAYS, overdueDays, SALES_WINDOW_DAYS } from "@/lib/rotation/forecast";
import type { SourceLabel } from "@/lib/rotation/labels";
import type { ShopData } from "@/lib/rotation/load";
import type { Snapshot } from "@/lib/rotation/snapshot";
import { indiaTime } from "@/lib/rotation/responses";

// Where a number on the money screens came from (spec E3, rule 5): the rows behind it, which add
// up to it. The owner's own view, so customer names may appear here.

export const rotationParts = [
  "due_7d",
  "owed_to_suppliers",
  "weekly_costs",
  "money_now",
  "usual_week_sales",
  "from_customers",
  "late",
  "with_customers",
  "on_shelf",
] as const;

export const rotationPart = z.enum(rotationParts);
export type RotationPart = z.infer<typeof rotationPart>;

type Row = {
  title: string;
  detail: string | null;
  date: string | null;
  paise: number;
  label: SourceLabel;
};

const sum = (rows: Row[]) => rows.reduce((total, row) => total + row.paise, 0);

function customerRows(positions: CustomerPosition[]): Row[] {
  return positions.map((p) => ({
    title: p.name,
    detail: p.status.kind,
    date: p.oldestUnpaid,
    paise: p.balancePaise,
    label: p.label,
  }));
}

function rowsFor(part: RotationPart, data: ShopData, snapshot: Snapshot): Row[] {
  const { week } = snapshot;
  const unpaid = data.payables
    .filter((p) => !p.paid)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const bill = (p: ShopData["payables"][number]): Row => ({
    title: [p.distributor, p.billNumber].filter(Boolean).join(" · "),
    detail:
      overdueDays(p.dueDate, data.today) > 0
        ? `overdue ${overdueDays(p.dueDate, data.today)} days`
        : null,
    date: p.dueDate,
    paise: p.amountPaise,
    label: p.kind === "loan_emi" ? "owner_said" : "supplier_bill",
  });
  switch (part) {
    case "due_7d":
      return unpaid.filter((p) => p.dueDate <= addDays(data.today, FORECAST_DAYS)).map(bill);
    case "owed_to_suppliers":
      return unpaid.map(bill);
    case "weekly_costs":
      return data.costs.map((c) => ({
        title: c.kind,
        detail: c.period === "month" ? "a month, spread over its weeks" : "a week",
        date: null,
        paise: c.period === "week" ? c.amountPaise : Math.round((c.amountPaise * 12) / 52),
        label: "owner_said",
      }));
    case "money_now": {
      const said = week.likely.now.saidAt;
      if (said === null) return [];
      const close = data.dayCloses.find((d) => d.recordedAt === said);
      return [
        {
          title: "Money in hand, as you said",
          detail: null,
          date: indiaTime(said),
          paise: close?.moneyInHandPaise ?? 0,
          label: "owner_said",
        },
        ...data.payments
          .filter((p) => p.paidAt > said)
          .map((p): Row => ({
            title: "Payment received",
            detail: null,
            date: indiaTime(p.paidAt),
            paise: p.amountPaise,
            label: "verified_payment",
          })),
      ];
    }
    case "usual_week_sales": {
      const from = addDays(data.today, -(SALES_WINDOW_DAYS - 1));
      return data.dayCloses
        .filter((d) => d.cashSalesPaise !== null && d.businessDate >= from)
        .sort((a, b) => b.businessDate.localeCompare(a.businessDate))
        .map((d) => {
          const digital = data.payments
            .filter((p) => !p.isCreditRepayment && shopDate(p.paidAt) === d.businessDate)
            .reduce((total, p) => total + p.amountPaise, 0);
          return {
            title: "Cash said plus verified payments",
            detail: null,
            date: d.businessDate,
            paise: (d.cashSalesPaise ?? 0) + digital,
            label: "owner_said",
          };
        });
    }
    case "from_customers":
      return customerRows(snapshot.positions.filter((p) => p.status.kind === "due"));
    case "late":
      return customerRows(snapshot.positions.filter((p) => p.status.kind === "late"));
    case "with_customers":
      return customerRows(snapshot.positions);
    case "on_shelf":
      return snapshot.items
        .filter((i) => i.valuePaise !== null && i.valuePaise > 0)
        .sort((a, b) => (b.valuePaise ?? 0) - (a.valuePaise ?? 0))
        .map((i) => ({
          title: i.product.name,
          detail: i.countedAt ? `counted ${shopDate(i.countedAt)}` : "not counted",
          date: null,
          paise: i.valuePaise ?? 0,
          label: "estimate",
        }));
  }
}

/** The rows behind one part; the usual week's days add up to 7 times their average, not the sum. */
export function rotationSource(part: RotationPart, data: ShopData, snapshot: Snapshot) {
  const rows = rowsFor(part, data, snapshot);
  return {
    part,
    total_paise: part === "usual_week_sales" ? snapshot.week.likely.sales.paise : sum(rows),
    rows: rows.map((row) => ({
      title: row.title,
      detail: row.detail,
      date: row.date,
      paise: row.paise,
      label: row.label,
    })),
  };
}

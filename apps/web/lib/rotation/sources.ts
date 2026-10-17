import { z } from "zod";
import type { CustomerPosition } from "@/lib/rotation/credit";
import { addDays, shopDate } from "@/lib/time";
import { FORECAST_DAYS, overdueDays, SALES_WINDOW_DAYS } from "@/lib/rotation/forecast";
import type { SourceLabel } from "@/lib/rotation/labels";
import type { ShopData } from "@/lib/rotation/load";
import type { Snapshot } from "@/lib/rotation/snapshot";
import { indiaTime } from "@/lib/rotation/responses";

// Where a number on the money screens came from (rule 5): the rows behind it, which add up to
// it. Each row is a kind with its facts, so screens write it in the owner's language. The owner's
// own view, so customer names may appear here.

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

type Base = { paise: number; label: SourceLabel };

export type SourceRow = Base &
  (
    | {
        kind: "bill";
        distributor: string;
        bill_number: string | null;
        due_date: string;
        overdue_days: number;
      }
    | { kind: "cost"; cost: string; period: "week" | "month" }
    | { kind: "money_in_hand"; at: string }
    | { kind: "payment"; at: string }
    | { kind: "day_sales"; date: string }
    | {
        kind: "customer";
        name: string;
        status: CustomerPosition["status"]["kind"];
        oldest_unpaid: string;
      }
    | { kind: "product"; name: string; art: string; counted_at: string | null }
  );

function customerRows(positions: CustomerPosition[]): SourceRow[] {
  return positions.map((p) => ({
    kind: "customer",
    name: p.name,
    status: p.status.kind,
    oldest_unpaid: p.oldestUnpaid,
    paise: p.balancePaise,
    label: p.label,
  }));
}

function billRows(data: ShopData, upTo: string | null): SourceRow[] {
  return data.payables
    .filter((p) => !p.paid && (upTo === null || p.dueDate <= upTo))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .map((p) => ({
      kind: "bill",
      distributor: p.distributor,
      bill_number: p.billNumber,
      due_date: p.dueDate,
      overdue_days: overdueDays(p.dueDate, data.today),
      paise: p.amountPaise,
      label: p.kind === "loan_emi" ? "owner_said" : "supplier_bill",
    }));
}

function moneyNowRows(data: ShopData, snapshot: Snapshot): SourceRow[] {
  const said = snapshot.week.likely.now.saidAt;
  if (said === null) return [];
  const close = data.dayCloses.find((d) => d.recordedAt === said);
  return [
    {
      kind: "money_in_hand",
      at: indiaTime(said),
      paise: close?.moneyInHandPaise ?? 0,
      label: "owner_said",
    },
    ...data.payments
      .filter((p) => p.paidAt > said)
      .map((p): SourceRow => ({
        kind: "payment",
        at: indiaTime(p.paidAt),
        paise: p.amountPaise,
        label: "verified_payment",
      })),
  ];
}

/** Each day the usual week was worked out from: the cash he said plus the verified payments. */
function salesRows(data: ShopData): SourceRow[] {
  const from = addDays(data.today, -(SALES_WINDOW_DAYS - 1));
  return data.dayCloses
    .filter((d) => d.cashSalesPaise !== null && d.businessDate >= from)
    .sort((a, b) => b.businessDate.localeCompare(a.businessDate))
    .map((d) => {
      const digital = data.payments
        .filter((p) => !p.isCreditRepayment && shopDate(p.paidAt) === d.businessDate)
        .reduce((total, p) => total + p.amountPaise, 0);
      return {
        kind: "day_sales",
        date: d.businessDate,
        paise: (d.cashSalesPaise ?? 0) + digital,
        label: "owner_said",
      };
    });
}

function rowsFor(part: RotationPart, data: ShopData, snapshot: Snapshot): SourceRow[] {
  switch (part) {
    case "due_7d":
      return billRows(data, addDays(data.today, FORECAST_DAYS));
    case "owed_to_suppliers":
      return billRows(data, null);
    case "weekly_costs":
      return data.costs.map((c) => ({
        kind: "cost",
        cost: c.kind,
        period: c.period,
        paise: c.period === "week" ? c.amountPaise : Math.round((c.amountPaise * 12) / 52),
        label: "owner_said",
      }));
    case "money_now":
      return moneyNowRows(data, snapshot);
    case "usual_week_sales":
      return salesRows(data);
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
          kind: "product",
          name: i.product.name,
          art: i.product.art,
          counted_at: i.countedAt === null ? null : indiaTime(i.countedAt),
          paise: i.valuePaise ?? 0,
          label: "estimate",
        }));
  }
}

/**
 * The rows behind one part. They add up to it, except the usual week, which is 7 times the
 * average day of its rows; a month's cost row is its weekly share.
 */
export function rotationSource(part: RotationPart, data: ShopData, snapshot: Snapshot) {
  const rows = rowsFor(part, data, snapshot);
  return {
    part,
    total_paise:
      part === "usual_week_sales"
        ? snapshot.week.likely.sales.paise
        : rows.reduce((total, row) => total + row.paise, 0),
    rows,
  };
}

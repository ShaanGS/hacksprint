import { collectOrder, type CustomerPosition, type CustomerStatus } from "@/lib/rotation/credit";
import type { Snapshot } from "@/lib/rotation/snapshot";

// The API's JSON for the money screens (docs/api.md), built from a snapshot. Snake case on the
// wire, like every v4 route.

const IST_OFFSET = "+05:30";

/** An instant written in India time, as the docs show it. */
export function indiaTime(instant: Date | string): string {
  const at = new Date(new Date(instant).getTime() + 5.5 * 3_600_000).toISOString();
  return `${at.slice(0, 19)}${IST_OFFSET}`;
}

export function rotationResponse(snapshot: Snapshot, now: Date, demoData: boolean) {
  const { week } = snapshot;
  return {
    as_of: indiaTime(now),
    demo_data: demoData,
    now: {
      on_shelf: {
        paise: snapshot.onShelf.paise,
        label: snapshot.onShelf.label,
        cost_unknown: snapshot.onShelf.costUnknown.map((p) => ({ product_id: p.id, name: p.name })),
      },
      with_customers: { paise: snapshot.withCustomers.paise, label: snapshot.withCustomers.label },
      owed_to_suppliers: snapshot.owedToSuppliers,
    },
    week: {
      from: week.from,
      to: week.to,
      needed: {
        paise: week.needed.paise,
        parts: [
          {
            key: "due_7d",
            paise: week.needed.due.paise,
            label: week.needed.due.label,
            bills: week.needed.due.bills,
            overdue_paise: week.needed.due.overduePaise,
          },
          { key: "weekly_costs", paise: week.needed.costs.paise, label: week.needed.costs.label },
        ],
      },
      likely: {
        paise: week.likely.paise,
        parts: [
          {
            key: "money_now",
            paise: week.likely.now.paise,
            label: week.likely.now.label,
            said_at: week.likely.now.saidAt === null ? null : indiaTime(week.likely.now.saidAt),
            verified_after_paise: week.likely.now.verifiedAfterPaise,
          },
          {
            key: "usual_week_sales",
            paise: week.likely.sales.paise,
            label: week.likely.sales.label,
            days_used: week.likely.sales.daysUsed,
          },
          {
            key: "from_customers",
            paise: week.likely.customers.paise,
            label: week.likely.customers.label,
            customers: week.likely.customers.customers,
          },
        ],
      },
      gap_paise: week.gapPaise,
      state: week.state,
      late: { paise: week.late.paise, customers: week.late.customers, label: week.late.label },
      asks: week.asks,
    },
  };
}

function reasonOf(status: CustomerStatus) {
  switch (status.kind) {
    case "late":
      return {
        kind: "late",
        usual_days: Math.round(status.usualDays),
        days_late: Math.round(status.daysLate),
      };
    case "unknown":
      return { kind: "unknown", settled: status.settled };
    case "due":
      return {
        kind: "due",
        usual_days: Math.round(status.usualDays),
        due_in_days: Math.round(status.dueInDays),
      };
    case "later":
      return {
        kind: "later",
        usual_days: Math.round(status.usualDays),
        due_in_days: Math.round(status.dueInDays),
      };
  }
}

export type OpenReminder = { id: string; paymentLinkUrl: string | null; createdAt: string };

export function customerRow(position: CustomerPosition, reminder: OpenReminder | null) {
  return {
    customer_id: position.customerId,
    name: position.name,
    lang: position.lang,
    balance_paise: position.balancePaise,
    label: position.label,
    oldest_unpaid: position.oldestUnpaid,
    reason: reasonOf(position.status),
    suggest_reminder: position.status.kind === "late",
    open_reminder: reminder
      ? {
          id: reminder.id,
          payment_link_url: reminder.paymentLinkUrl,
          created_at: indiaTime(reminder.createdAt),
        }
      : null,
  };
}

export function collectResponse(snapshot: Snapshot, reminders: Map<string, OpenReminder>) {
  return {
    customers: collectOrder(snapshot.positions).map((position) =>
      customerRow(position, reminders.get(position.customerId) ?? null),
    ),
    late_paise: snapshot.week.late.paise,
  };
}

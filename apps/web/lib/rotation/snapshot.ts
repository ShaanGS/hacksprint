import { positionOf, withCustomers, type CustomerPosition } from "@/lib/rotation/credit";
import { moneyCycleDays } from "@/lib/rotation/cycle";
import { weekForecast } from "@/lib/rotation/forecast";
import type { SourceLabel } from "@/lib/rotation/labels";
import type { ShopData } from "@/lib/rotation/load";
import { onShelf, shelf, stuckMoney } from "@/lib/rotation/stock";
import { addDays, shopDate } from "@/lib/time";

// The shop's money as of now (spec 9.1 to 9.12), worked out from what loadShopData read.
// `leaveOut` drops bills from the week, which is how the loan-ready check sees the week
// without the festival order (9.14).

export function snapshotOf(data: ShopData, leaveOut?: ReadonlySet<string>) {
  const positions = data.customers
    .map((customer) => positionOf(customer, data.today))
    .filter((position): position is CustomerPosition => position !== null);
  const items = shelf(
    data.products.map((p) => ({ id: p.id, name: p.name, art: p.art, unit: p.unit })),
    data.counts,
    data.receipts,
    data.now,
  );
  const owedPaise = data.payables.filter((p) => !p.paid).reduce((sum, p) => sum + p.amountPaise, 0);
  const week = weekForecast({
    payables: data.payables,
    costs: data.costs,
    dayCloses: data.dayCloses,
    payments: data.payments,
    positions,
    now: data.now,
    leaveOut,
  });
  const shelfTotal = onShelf(items);
  const customers = withCustomers(positions);
  const from = addDays(data.today, -28);
  const purchasesPaise = data.receipts
    .filter((r) => shopDate(r.at) > from && shopDate(r.at) <= data.today)
    .reduce((sum, r) => sum + r.lineTotalPaise, 0);
  return {
    positions,
    items,
    onShelf: shelfTotal,
    withCustomers: customers,
    owedToSuppliers: { paise: owedPaise, label: "supplier_bill" as SourceLabel },
    week,
    stuck: stuckMoney(items),
    cycle: moneyCycleDays({
      onShelfPaise: shelfTotal.paise,
      withCustomersPaise: customers.paise,
      owedToSuppliersPaise: owedPaise,
      purchasesPaise,
      dailySalesPaise: week.likely.sales.dailyPaise,
    }),
  };
}

export type Snapshot = ReturnType<typeof snapshotOf>;

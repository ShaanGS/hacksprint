import { draftSpokenCredit } from "@/lib/credit/parse";
import type { CreditBook, CreditEntry } from "@/lib/credit/types";
import type { OwnerOrder } from "@/lib/owner/types";
import { creditRows } from "@/lib/preview/owner";

// The credit book on sample data. Customers are known by name, which is their id here. The
// preview cannot hear, so a spoken entry is always "Rahul Sharma 200 on account".
const PREVIEW_HEARD = "Rahul Sharma 200 on account";

export function previewCredit(orders: () => OwnerOrder[]) {
  const spoken: { customer: string; amountPaise: number; heard: string; at: string }[] = [];

  function book(): CreditBook {
    const now = new Date().toISOString();
    const owed = new Map(creditRows(orders()).map((row) => [row.customer, row.owedPaise]));
    for (const entry of spoken) {
      owed.set(entry.customer, (owed.get(entry.customer) ?? 0) + entry.amountPaise);
    }
    const customers = [...owed]
      .map(([name, owedPaise]) => ({ id: name, name, owedPaise, lastAt: now }))
      .sort((a, b) => b.owedPaise - a.owedPaise);
    return { totalPaise: customers.reduce((sum, c) => sum + c.owedPaise, 0), customers };
  }

  function entries(customer: string): CreditEntry[] {
    const said = spoken
      .filter((entry) => entry.customer === customer)
      .map((entry) => ({
        at: entry.at,
        kind: "credit_sale" as const,
        amountPaise: entry.amountPaise,
        orderNumber: null,
        note: entry.heard,
      }));
    const earlier = creditRows(orders()).find((row) => row.customer === customer);
    const before = earlier
      ? [
          {
            at: new Date().toISOString(),
            kind: "credit_sale" as const,
            amountPaise: earlier.owedPaise,
            orderNumber: null,
            note: null,
          },
        ]
      : [];
    return [...said.reverse(), ...before];
  }

  function names() {
    const all = new Set([
      ...orders().map((order) => order.customer),
      ...book().customers.map((c) => c.name),
    ]);
    return [...all].sort().map((name) => ({ id: name, name }));
  }

  return {
    book,
    entries,
    hear: () => draftSpokenCredit(PREVIEW_HEARD, names()),
    add(customer: string, amountPaise: number, heard: string) {
      spoken.push({ customer, amountPaise, heard, at: new Date().toISOString() });
    },
  };
}

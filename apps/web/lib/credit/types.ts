import type { NamedCustomer } from "@/lib/credit/parse";

// The credit book (spec D1): what each customer owes, the entries behind it, and a spoken entry
// waiting for the owner's tap.

export type CreditCustomer = { id: string; name: string; owedPaise: number; lastAt: string };

export type CreditBook = { totalPaise: number; customers: CreditCustomer[] };

/** What was heard, read by code; nothing is written until the owner confirms it. */
export type CreditDraft = {
  heard: string;
  amountPaise: number | null;
  customerId: string | null;
  customers: NamedCustomer[];
};

export type CreditEntry = {
  at: string;
  kind: "credit_sale" | "repayment";
  amountPaise: number;
  orderNumber: number | null;
  note: string | null;
};

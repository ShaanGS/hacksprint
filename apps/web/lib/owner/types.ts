import type { SubmittedStatus } from "@/lib/customer/backend";
import type { ProductUnit } from "@/lib/orders/quantity";
import type { RejectReason } from "@/lib/orders/state";
import type { PaymentMode } from "@/lib/orders/submit";

// What the owner's screens show. Amounts are worked out by lib/orders, never typed in.

export type OwnerOrderLine = {
  code: string;
  name: string;
  art: string;
  qty: number;
  unit: ProductUnit;
  lineTotalPaise: number;
};

export type OwnerOrder = {
  number: number;
  customer: string;
  newCustomer: boolean;
  /** What the customer owed before this order. */
  balancePaise: number;
  placedAt: string;
  status: SubmittedStatus;
  paymentMode: PaymentMode;
  lines: OwnerOrderLine[];
  totalPaise: number;
  /** A swap the agent made, for the owner to check. */
  note: string | null;
  rejectReason: RejectReason | null;
};

export type CreditRow = { customer: string; since: string; owedPaise: number };

export type DaySummary = {
  orders: number;
  collectedPaise: number;
  creditPaise: number;
  owedPaise: number;
};

export type ReorderLine = {
  code: string;
  name: string;
  art: string;
  qty: number;
  unit: ProductUnit;
};

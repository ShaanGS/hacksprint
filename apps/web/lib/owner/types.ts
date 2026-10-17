import type { SubmittedStatus } from "@/lib/customer/backend";
import type { Lang } from "@/lib/i18n/languages";
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
  id: string;
  number: number;
  customer: string;
  /** The language the customer ordered in; the owner reads it in theirs (spec A2). */
  lang: Lang | null;
  newCustomer: boolean;
  /** What the customer owed before this order. */
  balancePaise: number;
  placedAt: string;
  status: SubmittedStatus;
  paymentMode: PaymentMode;
  lines: OwnerOrderLine[];
  totalPaise: number;
  /** What the shop told the customer was out of stock, so the owner can check any swap. */
  outOfStock: string[];
  rejectReason: RejectReason | null;
  /** The payment link, once approved; null if it could not be made (the owner can retry). */
  payUrl: string | null;
};

export type CreditRow = { customer: string; since: string; owedPaise: number };

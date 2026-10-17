import type { BillOutcome, ConfirmLine, ScannedBill } from "@/lib/bills/types";
import type { Lang } from "@/lib/i18n/languages";
import type { Margin } from "@/lib/margins";
import { call, post, upload } from "@/lib/owner/fetch";
import type { SourceLabel } from "@/lib/rotation/labels";
import type { RotationPart, SourceRow } from "@/lib/rotation/sources";
import type { MudraBandKey } from "@/lib/schemes/catalog";
import type { PriceSource } from "@/lib/sources/types";

// The owner app's calls to the money API, typed as docs/api.md describes them.

type Labelled = { paise: number; label: SourceLabel };

export type Rotation = {
  as_of: string;
  demo_data: boolean;
  now: {
    on_shelf: Labelled & { cost_unknown: { product_id: string; name: string }[] };
    with_customers: Labelled;
    owed_to_suppliers: Labelled;
  };
  week: {
    from: string;
    to: string;
    needed: {
      paise: number;
      parts: [
        Labelled & { key: "due_7d"; bills: number; overdue_paise: number },
        Labelled & { key: "weekly_costs" },
      ];
    };
    likely: {
      paise: number;
      parts: [
        Labelled & { key: "money_now"; said_at: string | null; verified_after_paise: number },
        Labelled & { key: "usual_week_sales"; days_used: number },
        Labelled & { key: "from_customers"; customers: number },
      ];
    };
    gap_paise: number;
    state: "short" | "close" | "ok";
    late: Labelled & { customers: number };
    asks: ("money_in_hand" | "cash_sales")[];
  };
};

export type Reason =
  | { kind: "late"; usual_days: number; days_late: number }
  | { kind: "unknown"; settled: number }
  | { kind: "due" | "later"; usual_days: number; due_in_days: number };

export type CustomerRow = {
  customer_id: string;
  name: string;
  lang: Lang | null;
  balance_paise: number;
  label: SourceLabel;
  oldest_unpaid: string;
  reason: Reason;
  suggest_reminder: boolean;
  open_reminder: {
    id: string;
    payment_id: string | null;
    payment_link_url: string | null;
    created_at: string;
  } | null;
};

export type CustomerDetail = {
  customer_id: string;
  name: string;
  lang: Lang | null;
  balance_paise: number;
  reason: Reason | null;
  entries: {
    id: string;
    at: string;
    kind: "credit_sale" | "repayment";
    amount_paise: number;
    label: SourceLabel;
    note: string | null;
    payment_id: string | null;
  }[];
};

export type Reminder = {
  reminder_id: string;
  payment_id: string;
  amount_paise: number;
  message_text: string;
  payment_link_url: string;
  whatsapp_url: string;
};

export type ShelfRow = {
  product_id: string;
  name: string;
  art: string;
  unit: string;
  pack_size: string | null;
  estimate_qty: number;
  counted_at: string | null;
  weekly_sales: number | null;
  sales_from: "counts" | "rebuy" | null;
  days_left: number | "not_moving" | null;
  unit_cost_paise: number | null;
  value_paise: number | null;
  tags: ("low" | "slow")[];
  count_asked: boolean;
};

export type Stock = {
  on_shelf_paise: number;
  cost_unknown: { product_id: string; name: string }[];
  products: ShelfRow[];
  festival_order: {
    festival: string;
    distributor: string;
    bill_number: string | null;
    total_paise: number;
    label: SourceLabel;
    lines: number;
  } | null;
};

export type SourceRows = { part: RotationPart; total_paise: number; rows: SourceRow[] };

export type EntryKind = "credit_given" | "credit_repaid_cash" | "day_close" | "stock_count";

export type VoiceCard = {
  entry_id: string | null;
  transcript: string;
  kind: EntryKind | null;
  card: {
    customer?: { id: string; name: string } | null;
    amount_paise?: number | null;
    cash_sales_paise?: number | null;
    money_in_hand_paise?: number | null;
    product?: { id: string; name: string } | null;
    qty?: number | null;
  } | null;
  needs: ("customer" | "amount" | "product" | "qty")[];
  choices: { id: string; name: string; art?: string }[];
};

export type Payable = {
  id: string;
  distributor: string;
  bill_number: string | null;
  kind: "supplier_bill" | "loan_emi";
  amount_paise: number;
  due_date: string;
  overdue_days: number;
  label: SourceLabel;
  festival_order: boolean;
};

export type Costs = {
  weekly_paise: number;
  costs: {
    kind: "rent" | "staff" | "home" | "cash_purchases" | "other";
    amount_paise: number;
    period: "week" | "month";
  }[];
};

export type Link = { label: string; url: string };

export type LoanPurpose = "stock_rotation" | "equipment";

export type LoanReady = {
  loan_request_id: string;
  need: {
    paise: number;
    label: SourceLabel;
    order: { festival: string; distributor: string; bill_number: string | null } | null;
  };
  gap_without_order_paise: number;
  can_collect_paise: number;
  late_customers: number;
  loan_needed_paise: number;
  no_loan_needed: boolean;
  scheme:
    | { name: string; band: MudraBandKey; band_name: string; range: string; links: Link[] }
    | { name: string; band: null; not_covered: "needs_tarun_repaid" | "above_mudra"; links: Link[] }
    | null;
  loan_form: { purpose: LoanPurpose; line: string; why: string; links: Link[] };
  registration:
    | { step: "none" }
    | { step: "udyam"; url: string; fact: string }
    | { step: "udyam_assist"; fact: string };
  checked_on: string;
  fixed_lines: string[];
};

export type Value = {
  late_credit_recovered_30d: { verified_paise: number; declared_paise: number };
  money_cycle_days: {
    now: number | null;
    first_weeks: number | null;
    freed_per_day_paise: number | null;
  };
};

const recordingName = (audio: Blob) => (audio.type.includes("mp4") ? "owner.mp4" : "owner.webm");

export const ownerApi = {
  rotation: () => call<Rotation>("/api/rotation"),
  source: (part: RotationPart) => call<SourceRows>(`/api/sources/rotation/${part}`),
  value: () => call<Value>("/api/value"),
  collect: () => call<{ customers: CustomerRow[]; late_paise: number }>("/api/rotation/collect"),
  customer: (id: string) => call<CustomerDetail>(`/api/credit/${id}`),
  remind: (id: string) => post<Reminder>(`/api/credit/${id}/remind`, {}),
  markPaid: (paymentId: string) =>
    post<{ paid: boolean }>(`/api/dev/payments/${paymentId}/mark-paid`, {}),
  stock: () => call<Stock>("/api/stock"),
  stuck: () => call<{ stuck_paise: number; products: ShelfRow[] }>("/api/stock/stuck"),
  priceSource: (productId: string) => call<PriceSource>(`/api/sources/price/${productId}`),
  margins: () => call<Margin[]>("/api/margins"),
  payables: () => call<{ total_paise: number; payables: Payable[] }>("/api/payables"),
  payablePaid: (id: string, paidVia: "cash" | "bank" | "upi") =>
    post<{ ok: true }>(`/api/payables/${id}/paid`, { paid_via: paidVia }),
  costs: () => call<Costs>("/api/setup/costs"),
  statement: () => call<{ share_url: string }>("/api/statement?months=3"),
  loanReady: (purpose: LoanPurpose) => post<LoanReady>("/api/loan-ready", { purpose }),
  loanPack: (loanRequestId: string) =>
    post<{ share_url: string }>("/api/loan-pack", { loan_request_id: loanRequestId }),
  hear: (audio: Blob) =>
    upload<VoiceCard>("/api/voice/owner", "audio", audio, recordingName(audio)),
  confirm: (entryId: string, picks: { customer_id?: string; product_id?: string }) =>
    post<{ ok: true; kind: EntryKind }>(`/api/voice/owner/${entryId}/confirm`, picks),
  reject: (entryId: string) => post<{ ok: true }>(`/api/voice/owner/${entryId}/reject`, {}),
  scanBill: (photo: Blob) => upload<ScannedBill>("/api/bills", "photo", photo, "bill.jpg"),
  confirmBill: (bill: ScannedBill, distributorId: string, lines: ConfirmLine[]) =>
    post<BillOutcome>(`/api/bills/${bill.id}/confirm`, {
      distributor_id: distributorId,
      due_date: bill.dueDate,
      lines: lines.map((line) => ({
        product_id: line.productId,
        qty: line.qty,
        unit_cost_paise: line.unitCostPaise,
        mrp_paise: line.mrpPaise,
      })),
    }),
};

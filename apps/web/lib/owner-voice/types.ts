// An owner voice entry (spec B1): one of four kinds, read from what he said, waiting for his tap.

export type EntryKind = "credit_given" | "credit_repaid_cash" | "day_close" | "stock_count";

export type ParsedEntry =
  | {
      kind: "credit_given" | "credit_repaid_cash";
      customerId: string | null;
      amountPaise: number | null;
    }
  | { kind: "day_close"; cashSalesPaise: number | null; moneyInHandPaise: number | null }
  | { kind: "stock_count"; productId: string | null; qty: number | null };

export type Named = { id: string; name: string };

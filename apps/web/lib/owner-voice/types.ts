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

/**
 * What the owner can ask about his own money, or what a list of items costs at his prices. The
 * answer's numbers come from code.
 */
export const questionTopics = [
  "week",
  "collect",
  "customer",
  "stock",
  "dues",
  "loan",
  "items",
] as const;

export type QuestionTopic = (typeof questionTopics)[number];

export type Question = {
  kind: "question";
  topic: QuestionTopic;
  customerId: string | null;
  /** For "items": each product and the quantity he said. */
  items: { productId: string; qty: number }[];
  /** For "items": what he asked for that the shop does not sell, as he said it. */
  missing: string[];
};

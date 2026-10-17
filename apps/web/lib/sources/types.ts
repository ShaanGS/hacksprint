// Where a number on screen comes from (spec E3, rule 6). Each view lists the rows behind one
// number, and its total is the sum of those rows, so the owner can check the number by eye.
// Dates are ISO strings; screens write them in the reader's language.

export type HomeNumbers = {
  /** Orders the voice page took today, and what they came to. */
  ordersCount: number;
  ordersPaise: number;
  collectedPaise: number;
  owedToShopPaise: number;
  owedByShopPaise: number;
};

export type HomeSourceKind = "orders" | "collected" | "owed-to-shop" | "owed-by-shop";

export type HomeSource =
  | {
      kind: "orders";
      totalPaise: number;
      rows: { orderNumber: number; customer: string; amountPaise: number; at: string }[];
    }
  | {
      kind: "collected";
      totalPaise: number;
      rows: {
        orderNumber: number;
        customer: string;
        amountPaise: number;
        at: string;
        reference: string | null;
      }[];
    }
  | {
      kind: "owed-to-shop";
      totalPaise: number;
      rows: { customer: string; amountPaise: number }[];
    }
  | {
      kind: "owed-by-shop";
      totalPaise: number;
      rows: { distributor: string; billNumber: string | null; amountPaise: number; due: string }[];
    };

/** A price and the bill line that printed it; null when no bill has set it yet. */
export type PriceSource = {
  productId: string;
  name: string;
  art: string;
  pricePaise: number;
  bill: {
    distributor: string;
    billNumber: string | null;
    billedOn: string;
    mrpPaise: number | null;
    /** What the shop paid: the owner sees it, a customer never does. */
    unitCostPaise: number | null;
    /** The photo of the bill, for the owner, when it was photographed. */
    photoUrl: string | null;
  } | null;
};

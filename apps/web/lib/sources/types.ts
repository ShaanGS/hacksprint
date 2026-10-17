// Where a price on screen comes from (rule 5). Dates are ISO strings; screens write them in the
// reader's language.

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

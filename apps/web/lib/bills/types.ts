import type { ProductUnit } from "@/lib/orders/quantity";

// A delivery bill on its way from photo to stock (spec B2 to B4): the photo is read into lines,
// the owner checks them by tapping, and confirming moves stock, prices and what the shop owes.

/** One printed line as read from the photo, matched to a product where one fits. */
export type ScannedLine = {
  printedName: string;
  productId: string | null;
  /** Null where the photo could not be read: the line is left out, or the bill photographed again. */
  qty: number | null;
  unitCostPaise: number | null;
  mrpPaise: number | null;
  /** The amount printed on the line, to check against quantity times rate. */
  printedTotalPaise: number | null;
};

export type Distributor = { id: string; name: string };

export type ScannedBill = {
  id: string;
  /** Matched from the name printed at the top, or null for the owner to pick. */
  distributorId: string | null;
  printedDistributor: string;
  billNumber: string | null;
  printedTotalPaise: number | null;
  /** When the bill says it is due, or null for the distributor's usual terms. */
  dueDate: string | null;
  lines: ScannedLine[];
  distributors: Distributor[];
  /** The day this paper bill was already added, if it was. */
  alreadyAddedOn: string | null;
};

export type ConfirmLine = {
  productId: string;
  qty: number;
  unitCostPaise: number;
  mrpPaise: number | null;
};

export type BillIssue =
  | { type: "missing"; productId: string; name: string; ordered: number }
  | { type: "qty_mismatch"; productId: string; name: string; ordered: number; received: number }
  | {
      type: "price_up";
      productId: string;
      name: string;
      oldCostPaise: number;
      newCostPaise: number;
      percent: number;
    };

export type StockChange = {
  productId: string;
  name: string;
  art: string;
  unit: ProductUnit;
  added: number;
  nowQty: number;
};

export type BillOutcome = {
  totalPaise: number;
  dueDate: string | null;
  stock: StockChange[];
  issues: BillIssue[];
};

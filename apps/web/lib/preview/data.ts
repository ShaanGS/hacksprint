import type { Product } from "@/lib/catalog";
import type { SubmittedStatus } from "@/lib/customer/backend";
import type { RejectReason } from "@/lib/orders/state";
import type { PaymentMode } from "@/lib/orders/submit";
import { orderTotalPaise } from "@/lib/orders/totals";

// The preview's sample data: the same shop, products, customers and orders as the database
// seed (supabase/migrations/*_demo_data.sql), so the screens look the same before and after
// the keys are added.

export const previewShop = {
  name: "Lakshmi Stores",
  ownerName: "Murugan",
  distributorName: "Sri Balaji Agencies",
};

type Row = [
  code: string,
  name: string,
  packSize: string | null,
  category: string,
  unit: Product["unit"],
  rupees: number,
  stockQty: number,
  lowStockThreshold: number,
  art: string,
];

const rows: Row[] = [
  ["maggi", "Maggi Masala Noodles", "70 g", "noodles", "pack", 14, 48, 12, "noodles"],
  ["butter", "Amul Butter", "100 g", "butter", "pack", 58, 12, 4, "butter"],
  ["sugar", "Sugar", null, "sweetener", "kg", 46, 0, 5, "sugar"],
  ["jaggery", "Jaggery", null, "sweetener", "kg", 70, 10, 3, "jaggery"],
  [
    "gold-winner-oil",
    "Gold Winner Sunflower Oil",
    "1 litre",
    "sunflower_oil",
    "pack",
    165,
    2,
    6,
    "oil",
  ],
  ["fortune-oil", "Fortune Sunflower Oil", "1 litre", "sunflower_oil", "pack", 170, 10, 4, "oil"],
  ["ponni-rice", "Ponni Raw Rice", null, "rice", "kg", 62, 50, 10, "rice"],
  ["toor-dal", "Toor Dal", null, "dal", "kg", 160, 20, 5, "dal"],
  ["atta", "Aashirvaad Shudh Chakki Atta", "5 kg", "atta", "pack", 295, 12, 3, "atta"],
  ["salt", "Tata Salt", "1 kg", "salt", "pack", 28, 40, 10, "salt"],
  ["aavin-milk", "Aavin Toned Milk", "500 ml", "milk", "pack", 22, 30, 10, "milk"],
  ["bread", "Britannia Milk Bread", "400 g", "bread", "pack", 50, 8, 3, "bread"],
  ["eggs", "Eggs", null, "eggs", "piece", 6, 90, 30, "eggs"],
  ["chips", "Lay's Classic Salted", "50 g", "chips", "pack", 20, 24, 8, "chips"],
  ["tea", "Tata Tea Premium", "250 g", "tea", "pack", 150, 10, 3, "tea"],
  ["batter", "Idli Dosa Batter", "1 kg", "batter", "pack", 60, 10, 4, "batter"],
  ["detergent", "Surf Excel Easy Wash", "1 kg", "detergent", "pack", 140, 8, 3, "detergent"],
  ["soap", "Hamam Neem Soap", "100 g", "soap", "pack", 38, 12, 4, "soap"],
  ["toothpaste", "Colgate Strong Teeth", "100 g", "toothpaste", "pack", 55, 10, 3, "toothpaste"],
];

export const previewProducts: Product[] = rows.map(
  ([code, name, packSize, category, unit, rupees, stockQty, lowStockThreshold, art]) => ({
    id: code,
    code,
    name,
    packSize,
    category,
    unit,
    pricePaise: rupees * 100,
    stockQty,
    lowStockThreshold,
    art,
  }),
);

export function previewProduct(code: string): Product {
  const product = previewProducts.find((p) => p.code === code);
  if (!product) throw new Error(`No preview product ${code}`);
  return product;
}

export type PreviewLine = { code: string; qty: number };

export function previewTotal(lines: PreviewLine[]): number {
  return orderTotalPaise(
    lines.map((line) => ({ qty: line.qty, unitPricePaise: previewProduct(line.code).pricePaise })),
  );
}

export type PreviewOrder = {
  number: number;
  customer: string;
  newCustomer: boolean;
  placedAt: string;
  status: SubmittedStatus;
  paymentMode: PaymentMode;
  lines: PreviewLine[];
  /** A swap the agent made, for the owner to see. */
  note?: string;
  rejectReason?: RejectReason;
};

/** The order the preview customer places: the demo order from docs/PRODUCT-PLAN.md. */
export const PREVIEW_ORDER_NUMBER = 8;

export const previewOrders: PreviewOrder[] = [
  {
    number: PREVIEW_ORDER_NUMBER,
    customer: "Lakshmi Raman",
    newCustomer: false,
    placedAt: "7:12 PM",
    status: "pending_approval",
    paymentMode: "link",
    lines: [
      { code: "maggi", qty: 2 },
      { code: "butter", qty: 1 },
      { code: "jaggery", qty: 0.5 },
    ],
    note: "Jaggery instead of sugar, which is out of stock",
  },
  {
    number: 9,
    customer: "Kavya Gowda",
    newCustomer: true,
    placedAt: "7:20 PM",
    status: "pending_approval",
    paymentMode: "credit",
    lines: [
      { code: "toor-dal", qty: 0.5 },
      { code: "aavin-milk", qty: 2 },
    ],
  },
  {
    number: 7,
    customer: "Arjun Reddy",
    newCustomer: false,
    placedAt: "6:42 PM",
    status: "paid",
    paymentMode: "link",
    lines: [
      { code: "butter", qty: 1 },
      { code: "eggs", qty: 6 },
    ],
  },
  {
    number: 6,
    customer: "Meena Krishnan",
    newCustomer: false,
    placedAt: "5:52 PM",
    status: "on_credit",
    paymentMode: "credit",
    lines: [
      { code: "ponni-rice", qty: 1 },
      { code: "salt", qty: 1 },
    ],
  },
  {
    number: 5,
    customer: "Rahul Sharma",
    newCustomer: false,
    placedAt: "4:50 PM",
    status: "delivered",
    paymentMode: "link",
    lines: [
      { code: "maggi", qty: 2 },
      { code: "chips", qty: 1 },
    ],
  },
  {
    number: 4,
    customer: "Lakshmi Raman",
    newCustomer: false,
    placedAt: "4:02 PM",
    status: "delivered",
    paymentMode: "link",
    lines: [
      { code: "aavin-milk", qty: 1 },
      { code: "bread", qty: 1 },
    ],
  },
];

/** Earlier credit orders, as in the seed: who owed what before today. */
export const earlierCredit: { customer: string; since: string; lines: PreviewLine[] }[] = [
  {
    customer: "Lakshmi Raman",
    since: "11 Oct",
    lines: [
      { code: "ponni-rice", qty: 5 },
      { code: "gold-winner-oil", qty: 1 },
      { code: "salt", qty: 1 },
      { code: "aavin-milk", qty: 2 },
      { code: "toor-dal", qty: 1 },
      { code: "atta", qty: 1 },
      { code: "tea", qty: 1 },
      { code: "maggi", qty: 2 },
      { code: "batter", qty: 1 },
    ],
  },
  {
    customer: "Rahul Sharma",
    since: "12 Oct",
    lines: [
      { code: "detergent", qty: 1 },
      { code: "soap", qty: 2 },
      { code: "toothpaste", qty: 1 },
      { code: "bread", qty: 1 },
    ],
  },
];

import { risePercent } from "@/lib/bills/match";
import type {
  BillIssue,
  BillOutcome,
  ConfirmLine,
  ScannedBill,
  StockChange,
} from "@/lib/bills/types";
import type { Product } from "@/lib/catalog";
import { lineTotalPaise } from "@/lib/orders/totals";
import type { CostLine } from "@/lib/margins";
import type { HomeSource, PriceSource } from "@/lib/sources/types";

// The bill scan on sample data: whatever photo is taken, the preview "reads" today's delivery
// bill from Sri Balaji Agencies (scripts/fixtures/delivery-bill-sb-2073.jpg), and confirming it
// checks the delivery the way confirm_bill does.

const READ_MS = 2500;
const BALAJI = "balaji";

const distributors = [
  { id: BALAJI, name: "Sri Balaji Agencies" },
  { id: "murugan", name: "Murugan Traders" },
];

/** This morning's reorder to Sri Balaji Agencies, which the delivery is checked against. */
const ordered: Record<string, number> = {
  atta: 10,
  "gold-winner-oil": 10,
  sugar: 10,
  "toor-dal": 10,
  salt: 20,
};

/** What Sri Balaji Agencies charged on its last bill. */
const lastCost: Record<string, number> = {
  atta: 25400,
  sugar: 4000,
  "toor-dal": 13800,
  salt: 2400,
  "gold-winner-oil": 14200,
};

const DAY_MS = 24 * 60 * 60 * 1000;

function daysFromNow(days: number): string {
  return new Date(Date.now() + days * DAY_MS).toISOString().slice(0, 10);
}

/** What the shop owed its distributors before today's delivery. */
const earlierPayables = [
  {
    distributor: "Murugan Traders",
    billNumber: "MT-131",
    amountPaise: 987000,
    due: daysFromNow(1),
  },
  {
    distributor: "Sri Balaji Agencies",
    billNumber: "SB-2058",
    amountPaise: 1864000,
    due: daysFromNow(5),
  },
];

const printed = [
  ["Aashirvaad Shudh Chakki Atta 5 kg", "atta", 10, 27400, 29500],
  ["Sugar (per kg)", "sugar", 10, 4000, 4600],
  ["Toor Dal (per kg)", "toor-dal", 10, 13800, 16000],
  ["Tata Salt 1 kg", "salt", 20, 2400, 2800],
] as const;

export function previewBills(products: Product[]) {
  let addedOn: string | null = null;
  let today: { lines: ConfirmLine[]; totalPaise: number } | null = null;

  async function scanBill(): Promise<ScannedBill> {
    await new Promise((resolve) => setTimeout(resolve, READ_MS));
    return {
      id: "preview-bill",
      distributorId: BALAJI,
      printedDistributor: "SRI BALAJI AGENCIES",
      billNumber: "SB-2073",
      printedTotalPaise: 500000,
      lines: printed.map(([printedName, code, qty, cost, mrp]) => ({
        printedName,
        productId: code,
        qty,
        unitCostPaise: cost,
        mrpPaise: mrp,
        printedTotalPaise: qty * cost,
      })),
      distributors,
      alreadyAddedOn: addedOn,
    };
  }

  async function confirmBill(
    _bill: ScannedBill,
    distributorId: string,
    lines: ConfirmLine[],
  ): Promise<BillOutcome> {
    addedOn = new Date().toISOString();
    const stock: StockChange[] = lines.map((line) => {
      const product = products.find((p) => p.id === line.productId);
      if (product) product.stockQty += line.qty;
      return {
        productId: line.productId,
        name: product?.name ?? line.productId,
        art: product?.art ?? "bag",
        unit: product?.unit ?? "pack",
        added: line.qty,
        nowQty: product?.stockQty ?? line.qty,
      };
    });
    const issues: BillIssue[] = [];
    if (distributorId === BALAJI) {
      for (const [code, qty] of Object.entries(ordered)) {
        const received = lines
          .filter((line) => line.productId === code)
          .reduce((sum, line) => sum + line.qty, 0);
        const name = products.find((p) => p.id === code)?.name ?? code;
        if (received === 0) issues.push({ type: "missing", productId: code, name, ordered: qty });
        else if (received !== qty) {
          issues.push({ type: "qty_mismatch", productId: code, name, ordered: qty, received });
        }
      }
      for (const line of lines) {
        const before = lastCost[line.productId];
        if (before === undefined || line.unitCostPaise <= before) continue;
        issues.push({
          type: "price_up",
          productId: line.productId,
          name: products.find((p) => p.id === line.productId)?.name ?? line.productId,
          oldCostPaise: before,
          newCostPaise: line.unitCostPaise,
          percent: risePercent(before, line.unitCostPaise),
        });
      }
    }
    const totalPaise = lines.reduce(
      (total, line) =>
        total + lineTotalPaise({ qty: line.qty, unitPricePaise: line.unitCostPaise }),
      0,
    );
    today = { lines, totalPaise };
    return { totalPaise, stock, issues };
  }

  /** What the shop owes, with today's bill once it is in. */
  function payables(): Extract<HomeSource, { kind: "owed-by-shop" }>["rows"] {
    const todays = today
      ? [
          {
            distributor: "Sri Balaji Agencies",
            billNumber: "SB-2073",
            amountPaise: today.totalPaise,
            due: daysFromNow(15),
          },
        ]
      : [];
    return [...earlierPayables, ...todays];
  }

  /** Today's bill for what it delivered; Sri Balaji's last bill for everything else. */
  function priceSource(product: Product): PriceSource {
    const line = today?.lines.find((l) => l.productId === product.id);
    return {
      productId: product.id,
      name: product.name,
      art: product.art,
      pricePaise: product.pricePaise,
      bill: {
        distributor: "Sri Balaji Agencies",
        billNumber: line ? "SB-2073" : "SB-2058",
        billedOn: daysFromNow(line ? 0 : -10),
        mrpPaise: line?.mrpPaise ?? product.pricePaise,
        unitCostPaise:
          line?.unitCostPaise ??
          lastCost[product.id] ??
          Math.round((product.pricePaise * 0.86) / 100) * 100,
        photoUrl: null,
      },
    };
  }

  /** Last month's bills as the seed has them, and today's once it is in. */
  function costLines(): CostLine[] {
    const cost = (code: string, share: number) => {
      const price = products.find((p) => p.id === code)?.pricePaise ?? 0;
      return Math.round((price * share) / 100) * 100;
    };
    const billed = (distributorId: string, days: number, codes: string[], share: number) =>
      codes.map((code) => ({
        productId: code,
        distributorId,
        distributor: distributors.find((d) => d.id === distributorId)?.name ?? "",
        unitCostPaise:
          lastCost[code] && distributorId === BALAJI ? lastCost[code] : cost(code, share),
        at: daysFromNow(-days),
      }));
    const earlier = [
      ...billed(
        BALAJI,
        10,
        ["ponni-rice", "toor-dal", "sugar", "atta", "salt", "gold-winner-oil", "tea"],
        0.86,
      ),
      ...billed("murugan", 6, ["aavin-milk", "butter", "bread", "eggs", "maggi"], 0.84),
      ...billed("murugan", 6, ["atta", "gold-winner-oil"], 0.83),
    ];
    const todays = (today?.lines ?? []).map((line) => ({
      productId: line.productId,
      distributorId: BALAJI,
      distributor: "Sri Balaji Agencies",
      unitCostPaise: line.unitCostPaise,
      at: new Date().toISOString(),
    }));
    return [...earlier, ...todays];
  }

  return { scanBill, confirmBill, payables, priceSource, costLines };
}

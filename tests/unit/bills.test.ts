import { describe, expect, it } from "vitest";
import { lineAgrees, lineReady, matchDistributor, risePercent, toPaise } from "@/lib/bills/match";
import { billReading } from "@/lib/bills/read";
import type { ScannedLine } from "@/lib/bills/types";

const distributors = [
  { id: "balaji", name: "Sri Balaji Agencies" },
  { id: "murugan", name: "Murugan Traders" },
];

const atta: ScannedLine = {
  printedName: "Aashirvaad Shudh Chakki Atta 5 kg",
  productId: "atta",
  qty: 10,
  unitCostPaise: 27400,
  mrpPaise: 29500,
  printedTotalPaise: 274000,
};

describe("reading a bill", () => {
  it("knows the distributor however the top of the bill prints it", () => {
    expect(matchDistributor("SRI BALAJI AGENCIES", distributors)).toBe("balaji");
    expect(matchDistributor("Sri Balaji Agencies, Chennai", distributors)).toBe("balaji");
    expect(matchDistributor("Murugan Traders.", distributors)).toBe("murugan");
  });

  it("leaves an unknown distributor for the owner to pick", () => {
    expect(matchDistributor("Ganesh Wholesale", distributors)).toBeNull();
    expect(matchDistributor("", distributors)).toBeNull();
  });

  it("turns printed rupees into paise", () => {
    expect(toPaise(274)).toBe(27400);
    expect(toPaise(46.5)).toBe(4650);
    expect(toPaise(null)).toBeNull();
  });

  it("works out a price rise to the whole percent", () => {
    expect(risePercent(25400, 27400)).toBe(8);
    expect(risePercent(4000, 4000)).toBe(0);
  });

  it("flags a line whose quantity times rate is not the printed amount", () => {
    expect(lineAgrees(atta)).toBe(true);
    expect(lineAgrees({ ...atta, printedTotalPaise: 284000 })).toBe(false);
    expect(lineAgrees({ ...atta, printedTotalPaise: null })).toBe(true);
  });

  it("needs a product, a quantity and a rate before a line can go in", () => {
    expect(lineReady(atta)).toBe(true);
    expect(lineReady({ ...atta, productId: null })).toBe(false);
    expect(lineReady({ ...atta, qty: null })).toBe(false);
  });

  it("accepts the model's reading only in the agreed shape", () => {
    const reading = {
      distributor: "SRI BALAJI AGENCIES",
      billNumber: "SB-2073",
      totalRupees: 5000,
      lines: [
        {
          printedName: "Sugar (per kg)",
          code: "sugar",
          qty: 10,
          unitCostRupees: 40,
          mrpRupees: 46,
          lineTotalRupees: 400,
        },
      ],
    };
    expect(billReading.parse(reading).lines[0].code).toBe("sugar");
    expect(() => billReading.parse({ ...reading, lines: [{ printedName: "Sugar" }] })).toThrow();
    const negative = { ...reading.lines[0], qty: -10 };
    expect(() => billReading.parse({ ...reading, lines: [negative] })).toThrow();
  });
});

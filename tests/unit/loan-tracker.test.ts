import { describe, expect, it } from "vitest";
import { canMove, emiDueDates, nextSteps, setAsideTonight } from "@/lib/loans/track";

const rupees = (value: number) => value * 100;

describe("loan steps", () => {
  it("goes applied, documents, sanctioned, disbursed, and may skip the documents step", () => {
    expect(canMove("applied", "docs_asked")).toBe(true);
    expect(canMove("applied", "sanctioned")).toBe(true);
    expect(canMove("docs_asked", "sanctioned")).toBe(true);
    expect(canMove("sanctioned", "disbursed")).toBe(true);
  });

  it("never jumps to disbursed or goes back", () => {
    expect(canMove("applied", "disbursed")).toBe(false);
    expect(canMove("sanctioned", "applied")).toBe(false);
    expect(canMove("disbursed", "rejected")).toBe(false);
  });

  it("can be turned down at any step before the money comes", () => {
    for (const from of ["applied", "docs_asked", "sanctioned"] as const) {
      expect(canMove(from, "rejected")).toBe(true);
    }
    expect(nextSteps("rejected")).toEqual([]);
  });
});

describe("EMI dates", () => {
  it("fall on the same day each month from the month after disbursal", () => {
    expect(emiDueDates("2026-10-17", 3)).toEqual(["2026-11-17", "2026-12-17", "2027-01-17"]);
  });

  it("use day 28 when disbursal is on the 29th to 31st", () => {
    expect(emiDueDates("2026-01-31", 2)).toEqual(["2026-02-28", "2026-03-28"]);
  });
});

describe("set-aside tonight (9.16)", () => {
  const base = {
    emiPaise: rupees(3_000),
    keptPaise: 0,
    dueDate: "2026-10-22",
    today: "2026-10-17",
    todaySalesPaise: null,
    usualDayPaise: rupees(5_000),
  };

  it("spreads what is left over the days left, rounded up to ₹10", () => {
    const plan = setAsideTonight({ ...base, keptPaise: rupees(1_000), dueDate: "2026-10-20" });
    expect(plan.daysLeft).toBe(3);
    expect(plan.tonightPaise).toBe(rupees(670));
  });

  it("keeps more on a busy day and less on a slow one, within half to double", () => {
    expect(setAsideTonight({ ...base, todaySalesPaise: rupees(7_500) }).tonightPaise).toBe(
      rupees(900),
    );
    expect(setAsideTonight({ ...base, todaySalesPaise: 0 }).tonightPaise).toBe(rupees(300));
    expect(setAsideTonight({ ...base, todaySalesPaise: rupees(50_000) }).tonightPaise).toBe(
      rupees(1_200),
    );
  });

  it("asks for all that remains on the last night or once the EMI is due", () => {
    const lastNight = { ...base, keptPaise: rupees(2_500), dueDate: "2026-10-18" };
    expect(setAsideTonight({ ...lastNight, todaySalesPaise: 0 }).tonightPaise).toBe(rupees(500));
    expect(setAsideTonight({ ...base, dueDate: "2026-10-15" }).tonightPaise).toBe(rupees(3_000));
  });

  it("never asks for more than remains", () => {
    const plan = setAsideTonight({
      ...base,
      keptPaise: rupees(2_990),
      todaySalesPaise: rupees(9_000),
    });
    expect(plan.tonightPaise).toBe(rupees(10));
  });

  it("waits until the EMI is within the week, and stops once it is all kept", () => {
    expect(setAsideTonight({ ...base, dueDate: "2026-11-17" })).toMatchObject({
      started: false,
      tonightPaise: 0,
    });
    expect(setAsideTonight({ ...base, keptPaise: rupees(3_000) }).tonightPaise).toBe(0);
  });
});
